#!/usr/bin/env bash

rm firefox.zip
cd browser-extension || exit 1
zip -r ../firefox.zip *
