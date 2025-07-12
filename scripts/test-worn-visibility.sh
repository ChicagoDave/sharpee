#!/bin/bash
cd /mnt/c/repotemp/sharpee/packages/world-model
pnpm test -- --testNamePattern="should see worn items on actors"
