'use strict';

var _ = require('underscore');
var $ = require('jquery');
var Backbone = require('backbone');
Backbone.$ = $;

var Promise = require('es6-promise').Promise;
var ProtoBuf = require('protobufjs');

var BackstageModel = require('./backstage').Model;
var Analyses = require('./analyses');
var DataSetViewModel = require('./dataset').DataSetViewModel;

var ProgressModel = Backbone.Model.extend({
    defaults : {
        task     : '',
        progress : 0,
        complete : true
    }
});

var ResultsModel = Backbone.Model.extend({

    createAnalysis : function(name) {

        console.log('analysis created: ' + name);
        this.trigger("analysisSelected", name);
    }

});

var Instance = Backbone.Model.extend({

    initialize: function() {

        _.bindAll(this,
            'connect',
            'open',
            'receiveMessage',
            'retrieveSettings',
            '_retrieveCells',
            '_requestCells',
            '_retrieveInfoEvent',
            '_retrieveCellsEvent',
            '_retrieveSettingsEvent');

        this.transId = 0;
        this.command = '';
        this.seqNo = 0;

        this._dataSetModel = new DataSetViewModel();
        this._dataSetModel.on('change:viewport', this._retrieveCells, this);

        this._progressModel = new ProgressModel();

        this._backstageModel = new BackstageModel();
        this._backstageModel.on('dataSetOpenRequested', this._openDataSetRequest, this);

        this._analyses = new Analyses();
        this._analyses.on('analysisCreated', this._analysisCreated, this);

        this._resultsModel = new ResultsModel();

    },
    defaults : {
        host : ''
    },
    progressModel : function() {

        return this._progressModel;
    },
    dataSetModel : function() {

        return this._dataSetModel;
    },
    backstageModel: function() {

        return this._backstageModel;
    },
    resultsModel : function() {

        return this._resultsModel;
    },
    analyses : function() {

        return this._analyses;
    },
    _openDataSetRequest : function(params) {

        var self = this;

        this.open(params.path).then(function() {
            self._backstageModel.notifyDataSetLoaded();
        });
    },
    receiveMessage : function(event) {

        var self = this;

        return new Promise(function(resolve, reject) {

            var reader = new FileReader();
            reader.onloadend = function() {
                resolve(reader.result);
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(event.data);

        }).then(function(arrayBuffer) {

            var response = self._coms.Response.decode(arrayBuffer);
            switch (response.params) {
                case 'open':
                    self._openEvent(response.open);
                    break;
                case 'info':
                    self._retrieveInfoEvent(response.info);
                    break;
                case 'cells':
                    self._retrieveCellsEvent(response.cells);
                    break;
                case 'settings':
                    self._retrieveSettingsEvent(response.settings);
                    break;
                default:
                    console.log('unrecognized response');
                    console.log(response);
                    break;
            }
        }).catch(function(err) {

            console.log(err);
        });

    },
    connect  : function() {

        var host = this.get('host');
        var self = this;

        Promise.all([
            new Promise(function(resolve, reject) {

                ProtoBuf.loadProtoFile('s/proto/clientcoms.proto', function(err, builder) {
                    if (err) {
                        reject(err);
                    }
                    else {
                        self._builder = builder;
                        self._coms = builder.build();
                        resolve();
                    }
                });
            }),
            new Promise(function(resolve, reject) {

                self._ws = new WebSocket('ws://' + host + '/coms');

                self._ws.onopen = function() {
                    console.log('opened!');
                    resolve();
                };
                self._ws.onerror = reject;
                self._ws.onmessage = self.receiveMessage;
                self._ws.onclose = function(msg) {
                    console.log('websocket closed!');
                    console.log(msg);
                };
            })
        ]).then(function() {

            return self.retrieveSettings();

        }).then(function() {

            return self.retrieveInfo();

        }).catch(function(err) {

            console.log('error ' + err);
        });

    },
    open : function(path) {

        var params  = new this._coms.OpenReqParams(path);
        var request = new this._coms.Request();
        request.open = params;

        return this._send(request);
    },
    _analysisCreated : function(analysis) {

        return analysis.ready.then(function() {

            var params = new this._coms.AnalysisReqParams();
            params.name = analysis.name;
            params.ns = analysis.ns;

            var request = new this._coms.Request();
            request.analysis = params;

            return this._send(request);
        });
    },
    retrieveInfo : function() {

        var params  = new this._coms.InfoReqParams();
        var request = new this._coms.Request();
        request.info = params;

        return this._send(request);
    },
    _retrieveCells : function() {
        this._viewport = this._dataSetModel.get('viewport');
        this._requestCells();
    },
    retrieveSettings : function() {

        var params = new this._coms.SettingsReqParams();
        var request = new this._coms.Request();
        request.settings = params;

        return this._send(request);
    },
    _retrieveSettingsEvent : function(settings) {

        this._backstageModel.set('settings', settings);

        if (this._notifySuccess)
            this._notifySuccess();
        this._notifySuccess = null;
        this._notifyFailure = null;
    },
    _requestCells : function() {

        var params = new this._coms.CellsReqParams();
        params.rowStart    = this._viewport.top;
        params.columnStart = this._viewport.left;
        params.rowEnd      = this._viewport.bottom;
        params.columnEnd   = this._viewport.right;

        var request = new this._coms.Request();
        request.cells = params;

        return this._send(request);
    },
    _retrieveCellsEvent : function(params) {

        var columns = params.columns;

        var rowStart    = params.reqParams.get('rowStart');
        var columnStart = params.reqParams.get('columnStart');
        var rowEnd      = params.reqParams.get('rowEnd');
        var columnEnd   = params.reqParams.get('columnEnd');

        var viewport = this._viewport;

        if (rowStart != viewport.top || columnStart != viewport.left || rowEnd != viewport.bottom || columnEnd != viewport.right)
            return;

        var columnCount = columnEnd - columnStart + 1;
        var rowCount    = rowEnd    - rowStart + 1;

        var cells = new Array(columnCount);

        for (var colNo = 0; colNo < columnCount; colNo++) {

            var column = columns[colNo];
            var values = column.get(column.cells).values;

            cells[colNo] = values;
        }

        this._dataSetModel.set('cells', cells);

        if (this._notifySuccess)
            this._notifySuccess();
        this._notifySuccess = null;
        this._notifyFailure = null;
    },
    _stringifyMeasureType : function(measureType) {
        switch (measureType) {
            case 1:
                return 'nominaltext';
            case 2:
                return 'nominal';
            case 3:
                return 'ordinal';
            case 4:
                return 'continuous';
            default:
                return '';
        }
    },
    _retrieveInfoEvent : function(params) {

        if (params.hasDataSet) {

            var columnInfo = _.map(params.schema.fields, function(field) {
                return { name : field.name, width: field.width, measureType : this._stringifyMeasureType(field.measureType) };
            }, this);
            this._dataSetModel.setNew({
                rowCount : params.rowCount,
                columnCount : params.columnCount,
                columns : columnInfo
            });
        }

        if (this._notifySuccess)
            this._notifySuccess();
        this._notifySuccess = null;
        this._notifyFailure = null;
    },
    _openEvent : function(params) {

        var complete = (params.status === this._coms.Status.COMPLETE);

        this._progressModel.set("task",     params.progress_task);
        this._progressModel.set("progress", params.progress);
        this._progressModel.set("complete", complete);

        if (complete) {
            if (this._notifySuccess)
                this._notifySuccess();
            this._notifySuccess = null;
            this._notifyFailure = null;

            this.retrieveInfo();
        }
    },
    _send : function(request) {

        this.transId++;

        request.id = this.transId;
        this._ws.send(request.toArrayBuffer());

        var self = this;

        return new Promise(function(resolve, reject) {
            self._notifySuccess = resolve;
            self._notifyFailure = reject;
        });
    }
});

module.exports = Instance;