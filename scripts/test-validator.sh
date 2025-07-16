#!/bin/bash
cd /mnt/c/repotemp/sharpee
pnpm test:stdlib -- --testNamePattern="CommandValidator.*Golden.*Basic Validation"
