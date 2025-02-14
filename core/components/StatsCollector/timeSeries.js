const modulename = 'TimeSeries';
import fse from 'fs-extra';
import logger from '@core/extras/console.js';
import { verbose } from '@core/globalData.js';
const { dir, log, logOk, logWarn, logError } = logger(modulename);

//Helpers
const isUndefined = (x) => { return (typeof x === 'undefined'); };
const now = () => { return Math.round(Date.now() / 1000); };

/**
 * Simple Integer Time Series class with json file persistence
 * It implements a minimum resolution and a max window for the data.
 *
 * NOTE: Except for the constructor, this class will not return any errors,
 *       and should not be used to anything that requires data consistency.
 */
export default class TimeSeries {
    constructor(file, resolution, window) {
        if (isUndefined(file) || isUndefined(resolution) || isUndefined(window)) {
            throw new Error('All parameters must be defined');
        }
        this.file = file;
        this.resolution = resolution;
        this.window = window;
        this.maxEntries = Math.round(window / resolution);

        //Load previous data
        let rawFile;
        try {
            rawFile = fse.readFileSync(file, 'utf8');
        } catch (error) {
            try {
                fse.writeFileSync(file, '[]');
                rawFile = '[]';
            } catch (error) {
                throw new Error('Unable to create timeseries file.');
            }
        }

        //Parse & clean previous data
        let oldData;
        try {
            oldData = JSON.parse(rawFile);
            oldData.filter((point) => {
                return (
                    !isUndefined(point.timestamp)
                    && Number.isInteger(point.timestamp)
                    && !isUndefined(point.data)
                    && Number.isInteger(point.data)
                    && now() - point.timestamp < window
                );
            });
        } catch (error) {
            oldData = [];
        }

        this.log = oldData;
    }


    //================================================================
    /**
     * Adds a new datapoint
     * @param {string} data
     */
    async add(value) {
        let currTs = now();
        if (
            !this.log.length
            || (currTs - this.log[this.log.length - 1].timestamp) > this.resolution
        ) {
            this.log.push({
                timestamp: currTs,
                value: value,
            });
        }

        if (this.log.length > this.maxEntries) this.log.shift();

        try {
            await fse.writeFile(this.file, JSON.stringify(this.log));
        } catch (error) {
            if (verbose) logWarn('Error writing the player history log file.');
        }
    }


    //================================================================
    /**
     * Returns the series
     */
    get() {
        let outList = this.log.filter((point) => {
            return (now() - point.timestamp < this.window);
        });

        return outList;
    }
};
