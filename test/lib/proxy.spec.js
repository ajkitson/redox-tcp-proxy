require('../test.helper');
var kue = require('kue');
var net = require('net');
var noop = function (){};

describe('Module: Proxy', function() {

  describe('Function: start', function() {

    var fakeQueue, config;

    beforeEach(function(){
      config = {
        jobType: 'TCP-PROXY-asdf-asdf-asdf',
        kue: {
          port: 1234,
          host: 'localhost',
          db: 0,
          prefix: 'q'
        }
      };

      fakeQueue = {
        process: sinon.stub()
      };

      sinon.stub(kue, 'createQueue').returns(fakeQueue);
    });

    afterEach(function(){
      kue.createQueue.restore();
    });

    it('should create a new kue queue', function () {
      proxy.start(config);
      expect(kue.createQueue).to.have.been.calledWith({
        prefix: config.kue.prefix,
        redis: {
          port: config.kue.port,
          host: config.kue.host,
      		db: config.kue.db
        }
      });
      expect(proxy.queue).to.eql(fakeQueue);
    });

    it('should include an auth key is config.kue.pass is set', function () {
      config.kue.pass = 'asdfasdf';

      proxy.start(config);
      expect(kue.createQueue).to.have.been.calledWith({
        prefix: config.kue.prefix,
        redis: {
          port: config.kue.port,
          host: config.kue.host,
      		db: config.kue.db,
          auth: config.kue.pass
        }
      });
    });

    it('should start processing the jobs', function () {
      proxy.start(config);
      expect(proxy.queue.process).to.have.been.calledWith(config.jobType, proxy.process);
    });
  });

  describe('Function: process', function() {

    var socket, job;

    beforeEach(function(){
      var EventEmitter = require('events').EventEmitter;

			socket = new EventEmitter();

			socket.connect = sinon.stub();
			socket.destroy = sinon.stub();
      socket.write = sinon.stub();
      socket.setTimeout = sinon.stub();

      sinon.stub(net, 'Socket').returns(socket);

      job = {
        data: {
          host: 'localhost',
          port: 1234
        }
      };

      proxy.sockets = {};

    });

    afterEach(function(){
      net.Socket.restore();
    });

    it('should do nothing if the job is a keepAlive job', function (done) {
      job.data.keepAlive = true;
      proxy.process(job, function (err, result) {
        expect(err).not.to.exist;
        expect(result).not.to.exist;
        expect(socket.write).not.to.have.been.called;
        done();
      });
    });

    it('should return an error if the job does not have a port', function (done) {
      delete job.data.port;
      proxy.process(job, function (err, result) {
        expect(err).to.exist;
        expect(result).not.to.exist;
        expect(socket.write).not.to.have.been.called;
        done();
      });
    });

    it('should return an error if the job does not have a host', function (done) {
      delete job.data.host;
      proxy.process(job, function (err, result) {
        expect(err).to.exist;
        expect(result).not.to.exist;
        expect(socket.write).not.to.have.been.called;
        done();
      });
    });

    it('should use an existing socket if there is one', function () {
      var key = job.data.host + ':' + job.data.port;
      proxy.sockets[key] = socket;
      proxy.process(job, noop);

      expect(socket.connect).not.to.have.been.called;
      expect(socket.write).to.have.been.called;
    });

    it('should create a new socket if there is not one', function () {
      var key = job.data.host + ':' + job.data.port;
      delete proxy.sockets[key];
      proxy.process(job, noop);
      expect(socket.connect).to.have.been.called;
      expect(socket.write).to.have.been.called;
    });

    it('should return results if data is received', function (done) {
      var ack = 'ack';
      proxy.process(job, function (err, result) {
        expect(err).not.to.exist;
        expect(result).to.equal(ack);
        done();
      });
      socket.emit('data', ack);
    });

    it('should return an error if an error occurs', function (done) {
      proxy.process(job, function (err, result) {
        expect(err).to.exist;
        expect(result).not.to.exist;
        done();
      });
      socket.emit('error', new Error());
    });

    it('should not return if the response comes after 5 seconds', function () {
      var clock = sinon.useFakeTimers();
      var done = sinon.spy();
      socket.setTimeout = function () {
        setTimeout(function(){
          socket.emit('timeout');
        }, 5000);
      };
      proxy.process(job, done);
      clock.tick(5000);
      expect(done).not.to.have.been.called;
    });

    it('should remove the socket on the close event', function () {
      proxy.process(job, function(){});

      socket.emit('close');

      expect(socket.destroy).to.have.been.called;
    });

  });

});
