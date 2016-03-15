# tiler-arcgis-compact

[![Circle CI](https://circleci.com/gh/FuZhenn/tiler-arcgis-compact.svg?style=svg)](https://circleci.com/gh/FuZhenn/tiler-arcgis-compact)

A map tile reader for compact tiles by ESRI ArcGIS.


## Introduction
[ArcGIS Compact Tile](https://server.arcgis.com/zh-cn/server/latest/publish-services/windows/inside-the-compact-cache-storage-format.htm) is a tile format since ArcGIS version 10.

It bundles exploded tile files into a .bundlx and a .bundle file and really reduces number of tile files.

This library is a reader for the bundles.

## Install

```bash
npm install tiler-arcgis-compact
```

## Usage

```javascript
var Tiler = require('tiler-arcgis-compact');
var tiler = new Tiler('/home/foo');
tiler.getTile(3408, 2417, 2, function(error, tile) {
    if (error) {
        throw error;
    }
    console.log(tile.lastModified);
    fs.writeFileSync('foo.png', tile.data);
});
```