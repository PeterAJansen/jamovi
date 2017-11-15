
from h5py import File
from h5py import Dataset
import numpy as np

from ...core import MeasureType


def read(data, path):

    with File(path, 'r') as file:

        h5ds = None
        for key in file.keys():
            h5ds = file[key]
            if isinstance(h5ds, Dataset):
                break
        else:
            raise RuntimeError('Does not contain hdf5 dataset')

        if len(h5ds.shape) == 1:

            for i in range(len(h5ds.dtype)):
                name = h5ds.dtype.names[i]
                column = data.dataset.append_column(name)

            n_rows = h5ds.shape[0]
            data.dataset.set_row_count(n_rows)

            for col_no in range(len(h5ds.dtype)):

                column = data.dataset[col_no]

                if np.can_cast(h5ds.dtype[col_no], np.int32):
                    for row_no in range(n_rows):
                        value = int(h5ds[row_no][col_no])
                        if not column.has_level(str(value)):
                            column.insert_level(value, str(value))
                        column[row_no] = value

                elif np.can_cast(h5ds.dtype[col_no], np.float64):
                    column.measure_type = MeasureType.CONTINUOUS
                    for row_no in range(n_rows):
                        value = float(h5ds[row_no][col_no])
                        column[row_no] = value
                    column.determine_dps()

        elif len(h5ds.shape) == 2:

            n_cols = h5ds.shape[1]
            for col_no in range(n_cols):
                name = str(col_no + 1)
                column = data.dataset.append_column(name)

                n_rows = h5ds.shape[0]
                data.dataset.set_row_count(n_rows)

            if np.can_cast(h5ds.dtype, np.int32):
                for col_no in range(n_cols):
                    column = data.dataset[col_no]
                    for row_no in range(n_rows):
                        value = int(h5ds[row_no][col_no])
                        if not column.has_level(str(value)):
                            column.insert_level(value, str(value))
                        column[row_no] = value

            elif np.can_cast(h5ds.dtype, np.float64):
                for col_no in range(n_cols):
                    column = data.dataset[col_no]
                    column.measure_type = MeasureType.CONTINUOUS
                    for row_no in range(n_rows):
                        value = float(h5ds[row_no][col_no])
                        column[row_no] = value
                    column.determine_dps()

        else:
            raise RuntimeError('Contains too high dimensions')

    data.title = 'Untitled'
    data.dataset.is_blank = False
