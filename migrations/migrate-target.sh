#!/bin/bash

rm -rf ui/src/target/*
mkdir -p ui/src/target/types
mkdir -p ui/src/target/idl
cp -rf target/idl ui/src/target
cp -rf target/types ui/src/target

