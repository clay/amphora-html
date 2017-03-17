FROM node:6.10.0

ENV HOME=/home/app

WORKDIR $HOME

COPY package.json $HOME

RUN npm install
RUN npm install -g nodemon

COPY . $HOME

EXPOSE 9000
