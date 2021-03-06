import {
    Image,
    ImageSource,
    Options,
    ComputedOptions,
    Callback,
    Filter
} from './typing'

import { Palette, Swatch } from './color'

import Bluebird = require('bluebird')
import defaults = require('lodash/defaults')

import Builder from './builder'

import * as Util from './util'

import * as Quantizer from './quantizer'
import * as Generator from './generator'
import * as Filters from './filter'


class Vibrant {
    static Builder = Builder
    static Quantizer = Quantizer
    static Generator = Generator
    static Filter = Filters
    static Util = Util

    static DefaultOpts: Partial<Options> = {
        colorCount: 64,
        quality: 5,
        generator: Generator.Default,
        ImageClass: null,
        quantizer: Quantizer.MMCQ,
        filters: [Filters.Default]
    }

    static from(src: ImageSource): Builder {
        return new Builder(src)
    }

    opts: ComputedOptions
    private _palette: Palette
    constructor(private _src: ImageSource, opts?: Partial<Options>) {
        this.opts = <ComputedOptions>defaults({}, opts, Vibrant.DefaultOpts)
        this.opts.combinedFilter = Filters.combineFilters(this.opts.filters)
    }
    private _process(image: Image, opts: ComputedOptions): Bluebird<Palette> {
        let { quantizer, generator} = opts

        image.scaleDown(opts)

        return image.applyFilter(opts.combinedFilter)
            .then((imageData) => quantizer(imageData.data, opts))
            .then((colors) => Swatch.applyFilter(colors, opts.combinedFilter))
            .then((colors) => Bluebird.resolve(generator(colors)))
    }

    palette(): Palette {
        return this.swatches()
    }
    swatches(): Palette {
        return this._palette
    }

    getPalette(cb?: Callback<Palette>): Bluebird<Palette> {
        let image = new this.opts.ImageClass()
        return image.load(this._src)
            .then((image) => this._process(image, this.opts))
            .tap((palette) => this._palette = palette)
            .finally(() => image.remove())
            .asCallback(cb)
    }
}

export default Vibrant