# The Corporate Way — Netlify production mapping

GitHub repository: `highdefinitionspeakers-collab/tcw-onboarding`
Netlify project: `the-corporate-way`
Netlify site ID: `302ec0c6-cc95-4ded-adcd-723dc79c91da`
Production domain: `https://www.essential-distribution.com`

## Current migration state

This repository contains The Corporate Way source material, but the reviewed Netlify production deploy is currently a manual/drop deployment rather than a Git-linked deploy.

## Rule going forward

Use GitHub as the code source of truth and Netlify as the production host. Before changing Netlify continuous deployment, compare this repository against the current production site so the existing live build is not accidentally replaced by an older onboarding build.

No production setting is changed by this file.
