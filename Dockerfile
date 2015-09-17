FROM quay.io/100health/redox-base

ADD . /opt/nodejs
WORKDIR /opt/nodejs

# Install npm packages
RUN npm install

# Default command
CMD forever app.js
