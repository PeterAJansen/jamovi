

from jamovi.core import MeasureType
from collections import OrderedDict


class FuncMeta:
    def __init__(self):
        self.is_row_wise = False
        self.is_column_wise = False
        self._parent = None
        self._measure_type = MeasureType.CONTINUOUS
        self._returns = [ ]

    def __str__(self):
        return str({
            'is_row_wise': self.is_row_wise,
            'is_column_wise': self.is_column_wise,
            'measure_type': self._measure_type,
            'returns': self._returns,
        })

    def set_m_type(self, m_type):
        self._measure_type = m_type

    def determine_m_type(self, args):
        if len(self._returns) == 0:
            return self._measure_type
        if len(args) == 0:
            return self._measure_type

        # not sure why this doesn't work:
        # types = map(lambda i: args[i].measure_type, self._returns)
        #
        # had to do this instead:
        types = [None] * len(self._returns)
        for i in range(len(self._returns)):
            arg_i = self._returns[i]
            if arg_i < len(args):
                types[i] = args[arg_i].measure_type

        mt = MeasureType.NOMINAL
        for t in list(types):
            if t is MeasureType.ORDINAL and mt is MeasureType.NOMINAL:
                mt = MeasureType.ORDINAL
            elif t is MeasureType.CONTINUOUS:
                mt = MeasureType.CONTINUOUS
            elif t is MeasureType.NOMINAL_TEXT:
                mt = MeasureType.NOMINAL_TEXT
                break

        return mt

    def determine_levels(self, args):
        if len(self._returns) == 0:
            return [ ]
        if len(args) == 0:
            return [ ]
        if determine_m_type(args) is not MeasureType.NOMINAL_TEXT:
            return [ ]

        level_use = OrderedDict()

        types = [None] * len(self._returns)
        for i in range(len(self._returns)):
            arg_i = self._returns[i]
            if arg_i < len(args):
                arg = args[arg_i]
                if not arg.has_levels:
                    continue
                for level in arg.levels:
                    level_use[level[1]] = 0

        for value in self._parent.fvalues():
            if value in level_use:
                level_use[value] += 1

        used_only = filter(lambda k: level_use[k] > 0, level_use)
        levels = map(lambda level: (level, level), used_only)
        
        return levels


def _meta(func):
    if not hasattr(func, 'meta'):
        func.meta = FuncMeta()
        func.meta._parent = func
    return func.meta


def returns(mt, *args):
    def inner(func):
        meta = _meta(func)
        meta._measure_type = mt
        meta._returns = args
        return func
    return inner


# row function decorator
def row_wise(func):
    meta = _meta(func)
    meta.is_row_wise = True
    meta.is_column_wise = False
    return func


# column function decorator
def column_wise(func):
    meta = _meta(func)
    meta.is_row_wise = False
    meta.is_column_wise = True
    return func
