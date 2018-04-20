
'use strict';

const $ = require('jquery');

function insertText(el, newText, cursorOffset = 0) {

    let sel = window.getSelection();
    let range = sel.getRangeAt(0);
    let start = range.startOffset;
    let end = range.endOffset;
    let text = el.textContent;
    let before = text.substring(0, start);
    let after  = text.substring(end, text.length);

    if (cursorOffset === -1 && start !== end) {
        let textSelected = text.substring(start, end);
        el.textContent = (before + newText.substring(0, newText.length - 2) + '(' + textSelected + ')' + after);
        sel.setBaseAndExtent(el.firstChild, start + newText.length + cursorOffset, el.firstChild, start + newText.length + textSelected.length + cursorOffset);
    } else {

        if (cursorOffset !== -1 && newText.search(/[ ~!@#$%^&*\+\-\=()\[\]{};,<>?/\\]/) !== -1)
            newText = '\`' + newText + '\`';

        el.textContent = (before + newText + after);
        sel.setBaseAndExtent(el.firstChild, start + newText.length + cursorOffset, el.firstChild, start + newText.length + cursorOffset);
    }
    el.focus();
}

function insertInto(open, close, input){
    let val = input.textContent, s = input.selectionStart, e = input.selectionEnd;
    if (e==s) {
        input.textContent = val.slice(0,e) + open + close + val.slice(e);
        input.selectionStart += close.length;
        input.selectionEnd = e + close.length;
    } else {
        input.textContent = val.slice(0,s) + open + val.slice(s,e) + close + val.slice(e);
        input.selectionStart += close.length + 1;
        input.selectionEnd = e + close.length;
    }

}

function allFunctions($functionsContent) {
    let descriptions = { };

    $functionsContent.append($('<div class="subtitle" data-name="">Math</div>'));
    $functionsContent.append($('<div class="item item-activated" data-name="ABS">ABS</div>'));
    descriptions.ABS = { label: 'ABS( <i>column_name</i> )', content: 'Returns the absolute value for each cell of the specified column.' };
    $functionsContent.append($('<div class="item" data-name="EXP">EXP</div>'));
    $functionsContent.append($('<div class="item" data-name="LN">LN</div>'));
    $functionsContent.append($('<div class="item" data-name="LOG10">LOG10</div>'));
    $functionsContent.append($('<div class="item" data-name="SQRT">SQRT</div>'));
    descriptions.SQRT = { label: 'SQRT( <i>column_name</i> )', content: 'Returns the square root for each cell of the specified column.' };

    $functionsContent.append($('<div class="subtitle" data-name="">Statistical</div>'));
    $functionsContent.append($('<div class="item" data-name="BOXCOX">BOXCOX</div>'));
    $functionsContent.append($('<div class="item" data-name="MEAN">MEAN</div>'));
    $functionsContent.append($('<div class="item" data-name="SCALE">SCALE</div>'));
    $functionsContent.append($('<div class="item" data-name="SUM">SUM</div>'));
    $functionsContent.append($('<div class="item" data-name="VMEAN">VMEAN</div>'));
    $functionsContent.append($('<div class="item" data-name="VMED">VMED</div>'));
    $functionsContent.append($('<div class="item" data-name="VMODE">VMODE</div>'));
    $functionsContent.append($('<div class="item" data-name="VN">VN</div>'));
    $functionsContent.append($('<div class="item" data-name="VSE">VSE</div>'));
    $functionsContent.append($('<div class="item" data-name="VSTDEV">VSTDEV</div>'));
    $functionsContent.append($('<div class="item" data-name="VSUM">VSUM</div>'));
    $functionsContent.append($('<div class="item" data-name="VVAR">VVAR</div>'));
    $functionsContent.append($('<div class="item" data-name="Z">Z</div>'));

    $functionsContent.append($('<div class="subtitle" data-name="">Logical</div>'));
    $functionsContent.append($('<div class="item" data-name="IF">IF</div>'));
    $functionsContent.append($('<div class="item" data-name="IFELSE">IFELSE</div>'));
    $functionsContent.append($('<div class="item" data-name="IFMISS">IFMISS</div>'));
    $functionsContent.append($('<div class="item" data-name="NOT">NOT</div>'));

    $functionsContent.append($('<div class="subtitle" data-name="">Misc</div>'));
    $functionsContent.append($('<div class="item" data-name="FILTER">FILTER</div>'));
    $functionsContent.append($('<div class="item" data-name="INT">INT</div>'));
    $functionsContent.append($('<div class="item" data-name="OFFSET">OFFSET</div>'));
    $functionsContent.append($('<div class="item" data-name="ROW">ROW</div>'));
    $functionsContent.append($('<div class="item" data-name="TEXT">TEXT</div>'));
    $functionsContent.append($('<div class="item" data-name="VALUE">VALUE</div>'));
    $functionsContent.append($('<div class="item" data-name="VROWS">VROWS</div>'));

    $functionsContent.append($('<div class="subtitle" data-name="">Simulation</div>'));
    $functionsContent.append($('<div class="item" data-name="BETA">BETA</div>'));
    $functionsContent.append($('<div class="item" data-name="GAMMA">GAMMA</div>'));
    $functionsContent.append($('<div class="item" data-name="NORM">NORM</div>'));
    $functionsContent.append($('<div class="item" data-name="UNIF">UNIF</div>'));

    return descriptions;
}

const toolbar = function(dataset) {
    this.dataset = dataset;
    this._inTools = false;

    $(window).resize( (event) => {
        this._findPosition();
    } );

    window.addEventListener('scroll', (event) => {
        if (this._shown && ! this._waiting && event.target !== this.$functionsContent[0] && event.target !== this.$varsContent[0]) {
            this.hide({ data: this });
        }
    }, true);

    this.$el = $('<div class="jmv-formula-toolbar-widget formula-toolbar-hidden formula-toolbar-remove"></div>');

    this.$options = $('<div class="jmv-formula-toolbar-options"></div>').appendTo(this.$el);

    this.$ops = $('<div class="ops-box"></div>').appendTo(this.$options);
    this.$label = $('<div class="option-label">This is a label!</div>').appendTo(this.$options);
    this.$description = $('<div class="option-description">This is the place where the option description will go!</div>').appendTo(this.$options);

    this.$functions = $('<div class="op"></div>').appendTo(this.$ops);
    this.$functionsTitle = $('<div class="title">Functions</div>').appendTo(this.$functions);
    this.$functionsContent = $('<div class="content"></div>').appendTo(this.$functions);

    this.descriptions = allFunctions(this.$functionsContent);

    let info = this.descriptions.ABS;
    if (info !== undefined) {
        this.$label.html(info.label);
        this.$description.html(info.content);
    }

    this.$functionsContent.on("dblclick", (event) => {
        if ($(event.target).hasClass('item')) {
            insertText(this.$formula[0], event.target.dataset.name + "()", -1);
            this.$formula.trigger('input', { });
        }
    });

    this.$functionsContent.on("click", (event) => {
        this.$formula.focus();
        $(".content .item").removeClass("item-activated");
        if ($(event.target).hasClass("item")) {
            $(event.target).addClass("item-activated");
            let info = this.descriptions[$(event.target).data('name')];
            if (info !== undefined) {
                this.$label.html(info.label);
                this.$description.html(info.content);
            }
            else {
                this.$label.html('');
                this.$description.html('No information about this function is avaliable');
            }
        }
        else {
            this.$label.html('');
            this.$description.html('');
        }
    });

    this.$vars = $('<div class="op"></div>').appendTo(this.$ops);
    this.$varsTitle = $('<div class="title">Variables</div>').appendTo(this.$vars);
    this.$varsContent = $('<div class="content"></div>').appendTo(this.$vars);

    this.$varsContent.on("dblclick", (event) => {
        if (event.target.dataset.name !== 'current' && $(event.target).hasClass('item')) {
            insertText(this.$formula[0], event.target.dataset.name);
            this.$formula.trigger('input', { });
        }
    });

    this.$varsContent.on("click", (event) => {
        this.$formula.focus();
        $(".content .item").removeClass("item-activated");
        $(event.target).addClass("item-activated");
        this.$label.html('Variable: ' + $(event.target).text());
        this.$description.html('This is a data variable.');
    });

    this.$el.on('mousedown', (event) => {
        this._inTools = true;
    });

    this.$el.on('click', (event) => {
        if (this.$formula)
            this.$formula.focus();
    });

    this.hide = function(event) {
        let self = event.data;
        if (self._inTools === false) {
            self.$el.addClass('formula-toolbar-hidden formula-toolbar-remove');
            self.$formula.off('blur.formula-toolbar', null, this.hide);
            self.$formula.trigger('editor:closing');
            self.$formula = null;
            self._shown = false;
            self._waiting = false;
        }
        else {
            self._inTools = false;
        }
    };

    this._findPosition = function() {
        if ( ! this.$formula )
            return;

        if ( ! this._shown)
            return;

        this.$el.removeClass('formula-toolbar-remove');
        setTimeout(() => {
            this.$el.removeClass('formula-toolbar-hidden');
            this.$el.on('transitionend', (event) => {
                this._waiting = false;
            });
        }, 0);

        let offset = this.$formula.offset();
        let positionInfo = this.$formula[0].getBoundingClientRect();
        let height = positionInfo.height;
        let width = this.$formula.outerWidth(false);
        let data = {
            top: offset.top + height + 1,
            left: offset.left
        };
        this.$el.offset(data);
        this.$el.outerWidth(width);
    };

    this.show = function($formula, variableName, wait) {

        if (this._shown && $formula === this.$formula)
            return;

        this._shown = true;
        this._waiting = wait;

        if (this.$formula)
            this.$formula.off('blur.formula-toolbar', null, this.hide);

        this.$formula = $formula;

        this.$formula.on('blur.formula-toolbar', null, this, this.hide);

        if ( ! wait)
            this._findPosition();

        this.$varsContent.empty();
        for (let col of this.dataset.get("columns")) {
            if (col.name !== '' && col.columnType !== 'filter') {
                if (col.name === variableName)
                    this.$varsContent.append($('<div class="item item-grayed-out" data-name="current">' + col.name + " (current)" + '</div>'));
                else
                    this.$varsContent.append($('<div class="item" data-name="' + col.name + '">' + col.name + '</div>'));
            }
        }
    };
};

let  _toolbar = null;

const init = function(dataset) {
    if (_toolbar === null) {
        _toolbar = new toolbar(dataset);
        $('body').append(_toolbar.$el);
    }
    else {
        _toolbar.dataset = dataset;
    }
};

const show = function($formula, variableName, wait) {
    _toolbar.show($formula, variableName, wait);
};

const hide = function() {
    _toolbar.hide();
};

const updatePosition = function() {
    _toolbar._findPosition();
};

const focusedOn = function() {
    return _toolbar.$formula;
};

const clicked = function() {
    return _toolbar._inTools;
};

module.exports = { init, show, hide, updatePosition, focusedOn, clicked };
