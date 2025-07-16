#!/bin/bash
cd /mnt/c/repotemp/sharpee
pnpm test:stdlib --testNamePattern="CommandValidator.*Basic Validation.*validates simple entity resolution"
