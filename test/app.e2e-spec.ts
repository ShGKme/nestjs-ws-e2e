import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './../src/app.module';
import * as io from 'socket.io-client';


describe('AppController (e2e)', () => {
  let app: INestApplication;
  let connectToSocketIO: () => SocketIOClient.Socket;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    await app.listen(0);
    const httpServer = app.getHttpServer();
    connectToSocketIO = () => io.connect(`http://127.0.0.1:${httpServer.address().port}`, { 
      transports: ['websocket'], 
      forceNew: true,
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it('should connect and disconnect', (done) => {
    const socket = connectToSocketIO();

    socket.on('connect', () => {
      socket.disconnect();
    });

    socket.on('disconnect', (reason) => {
      expect(reason).toBe('io client disconnect');
      done();
    });
    socket.on('error', done);
  });

  it('should echo in acknowledgement', (done) => {
    const socket = connectToSocketIO();
    
    socket.on('connect', () => {
      socket.emit('echo', 'Test', (acknowledgement) => {
        expect(acknowledgement).toBe('Test');
        socket.disconnect();
      });
    });

    socket.on('disconnect', (reason) => {
      expect(reason).toBe('io client disconnect');
      done();
    });
    socket.on('error', done);
  });


  it('should emit message on message', (done) => {
    const socket = connectToSocketIO();
    
    socket.on('connect', () => {
      socket.emit('message', 'Test');
    });

    socket.on('message', (message) => {
      expect(message).toBe(message);
      socket.disconnect();
    });

    socket.on('disconnect', (reason) => {
      expect(reason).toBe('io client disconnect');
      done();
    });

    socket.on('error', done);
    
  });

  it('should emit message on async message', (done) => {
    const socket = connectToSocketIO();
    
    socket.on('connect', () => {
      socket.emit('async-message', 'Test');
    });

    socket.on('message', (message) => {
      expect(message).toBe(message);
      socket.disconnect();
    });

    socket.on('disconnect', (reason) => {
      expect(reason).toBe('io client disconnect');
      done();
    });

    socket.on('error', done);
  });

  it('should broadcast with 2 clients', async (done) => {
    const promisifySocketHandler = (socket, event) => new Promise((resolve) => socket.on(event, resolve));
    const allSocketsHandle = (sockets, event) => sockets.map((socket) => promisifySocketHandler(socket, event));
    
    const sockets = [connectToSocketIO(), connectToSocketIO()];
    sockets.forEach((socket) => socket.on('error', done));

    await allSocketsHandle(sockets, 'connect');

    sockets[0].emit('broadcast', 'Test');
    
    const messages = await Promise.all(allSocketsHandle(sockets, 'broadcast'))
    messages.forEach((message) => expect(message).toBe('Test'));
    
    // We should wait until all sockets has disconnected
    await Promise.all(sockets.map((socket) => 
      new Promise((resolve) => {
        socket.on('disconnect', (reason) => {
          expect(reason).toBe('io client disconnect')
          resolve();
        });
        socket.disconnect();
      }))
    );
    
    done();
  }, 30000);
});
