#!/bin/bash
cd /mnt/c/repotemp/sharpee
pnpm test:stdlib -- --testNamePattern="closingAction.*Golden"
