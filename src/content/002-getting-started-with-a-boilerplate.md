---
layout: post
title: 'Getting started with the FuryStack Boilerplate'
author: [gallayl]
tags: ['getting-started']
image: img/002-getting-started-with-a-boilerplate-cover.jpg
date: '2021-06-23T08:48:20.257Z'
draft: false
excerpt: So this framework really kicks ass? And how can I start using it?
---

## Why can it be good for you?

If you want to try out the framework without digging deep all of its how-and-whys, you can simply clone the repo and start hacking in no time.

## Where can I found it?

No suprise, you can find it on a public [Github repo](https://github.com/furystack/boilerplate) 😉

## The Workspaces

The Boilerplate is basically a monorepo built with [Yarn Workspaces](https://classic.yarnpkg.com/blog/2017/08/02/introducing-workspaces/) and it includes 3 workspace by default: common, frontend and service.

### Common
You can share models, interfaces and logic between your frontend and the backend.
In the Boilerplate, there is a User and Session model and a REST API definition for login / logout.

### Frontend
A Single Page App, based on [Shades](https://github.com/furystack/furystack/tree/develop/packages/shades). It contains a basic layout with header and body, a basic service for login / logout management and login / logout functionality, some placeholder pages and a basic routing. The frontend is bundled with Webpack. The service URL is passed as an environment variable called `SERVICE_URL`.

### Service
The backend service, based entirely on FuryStack. It contains a filesystem-based store for users and an in-memory-store for sessions. It has implemented the example API (with login / logout) and has some other example implementations.

## Getting started

If you want to start a project based on the Boilerplate, the preferred flow should be something like this:

1. Create a new Repo, using the boilerplate as a template
1. Clone it
1. Install the dependencies
1. Build with `yarn build`
1. Start the frontend and the backend with `yarn start`
1. Open up the default link: [http://localhost:8080/](http://localhost:8080/)

## Other goodies

### Static code analysis

The project contains `eslint` and `prettier` to maintain code quality and formatting.

### Seed

It is a good practice to seed your db with basic data - there is a script for creating the test user, to run it, type `yarn seed`

### Unit tests

[Jest](https://jestjs.io/) has been also set up - to run, type `yarn test:unit`

### End-to-end testing

The boilerplate also includes end-to-end testing with [Cypress](https://www.cypress.io/)

### CI

There is an [Azure Pipelines](https://azure.microsoft.com/en-us/services/devops/pipelines/) setup included - you can check how this looks like [here](https://dev.azure.com/furystack/FuryStack/_build?definitionId=3).

The Pipeline contains the following steps:
 - Install dependencies
 - Run eslint (+prettier)
 - Build the project
 - Run the Unit tests (and publishes the results)
 - Runs the Seed(as it contains data that's needed for the e2e tests)
 - Start up the frontend, the service and run the Cypress E2E tests