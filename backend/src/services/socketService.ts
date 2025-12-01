import { Server, Socket } from 'socket.io';

let io: Server;

export const setupSocketHandlers = (serverIo: Server) => {
  io = serverIo;

  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join rooms for real-time updates
    socket.on('join:lineup', () => {
      socket.join('lineup');
      console.log(`👥 ${socket.id} joined lineup room`);
    });

    socket.on('join:photos', () => {
      socket.join('photos');
      console.log(`📸 ${socket.id} joined photos room`);
    });

    socket.on('join:albums', () => {
      socket.join('albums');
      console.log(`📁 ${socket.id} joined albums room`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });
};

// Helper functions to emit events
export const emitToLineup = (event: string, data: unknown) => {
  if (io) io.emit(event, data);
};

export const emitToPhotos = (event: string, data: unknown) => {
  if (io) io.to('photos').emit(event, data);
};

export const emitToAlbums = (event: string, data: unknown) => {
  if (io) io.to('albums').emit(event, data);
};