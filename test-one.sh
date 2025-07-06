#!/bin/bash
cd /mnt/c/repotemp/sharpee/packages/world-model
pnpm test -- --testNamePattern="should return false for entity in closed opaque container"
