#!/bin/bash
cd /mnt/c/repotemp/sharpee/packages/stdlib
pnpm test -- --testNamePattern="CommandValidator.*Basic Validation.*validates simple entity resolution" --verbose
