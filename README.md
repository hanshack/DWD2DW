# DWD to DW

DISCLAIMER: This project is a private open source project and doesn't have any connection with Deutscher Wetterdienst.

## Description

A script that scrapes tomorrow's weather data (max. temperature and weather condition) for some weather stations from the [German Meteorological Service (DWD)](https://dwd.de/). It then parses that data so that it can be used as a dataset for a Datawrapper](datawrapper.de/) **locator map**.

## Setup

    npm i

## Run script

    node ined

This will create a JSON called *markerData* that can be used in a *Datawrapper locator map*.

## Notes

A list of repos that use DWD data (scroll down): https://github.com/panodata/dwdweather2
Inspiration repo: https://github.com/FL550/simple_dwd_weatherforecast

List of all weather stations:
https://www.dwd.de/DE/leistungen/klimadatendeutschland/statliste/statlex_html.html?view=nasPublication&nn=16102

A useful source of active sations 
https://github.com/FL550/simple_dwd_weatherforecast/blob/master/simple_dwd_weatherforecast/mosmix_stationskatalog.txt

List of weather conditions and priority
https://www.dwd.de/DE/leistungen/opendata/help/schluessel_datenformate/kml/mosmix_element_weather_xls.xlsx?__blob=publicationFile&v=4

## Licenses

This script uses public data from [DWD OpenData](https://www.dwd.de/DE/leistungen/opendata/opendata.html). The Copyright can be viewed [here](https://www.dwd.de/DE/service/copyright/copyright_node.html).

