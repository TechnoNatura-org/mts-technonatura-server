import { Request } from 'express';
import { Socket } from 'socket.io';
import { arduinoSocketsT, arduinoSockets } from '../../db/arduinoSockets';

import SensorModel from '../../models/Arduino/Sensors/Sensor';

export default function ArduinoSocket(req: Request, socketGlobal: Socket) {
  console.log(`A user with id: ${socketGlobal.id} has connected`);
  // console.log(arduinoSockets);
  arduinoSockets.addSocket({
    socketId: socketGlobal.id,
    subscribe: {
      apps: false,
      sensors: [],
      realtimeData: [],
      realtimedata: [],
    },
  });
  // req.arduinoSockets = arduinoSockets;

  socketGlobal.on(
    'arduino.subscribe.sensor.realtimeData',
    async (sensorId: any, e: any, p: any) => {
      //   console.log(socket.id, data, e, p);
      const socket = arduinoSockets.arduinoSockets.find(
        (sck) => sck.socketId == socketGlobal.id,
      );

      //   console.log(socket);

      if (socket) {
        try {
          const sensor = await SensorModel.findById(sensorId);

          if (sensor) {
            const isAlreadySubsribed = socket.subscribe.realtimeData.find(
              (sb) => sb == sensorId,
            );

            if (!isAlreadySubsribed) {
              socket.subscribe.realtimeData.push(sensorId);
              console.log(
                `a user socket with id: ${socketGlobal.id} subscribed their sensor with id: ${sensorId}`,
              );

              req.io
                .of('/websocket/arduino')
                .to(socketGlobal.id)
                .emit('arduino.sensor.realtimeData', {
                  sensorId: sensorId,
                  data: sensor.realtimeData.data,
                  dateAdded: sensor.realtimeData.dateAdded,
                });
            }
          }
        } catch (err) {}
      }
    },
  );
  socketGlobal.on(
    'arduino.subscribe.sensor.realtimedata',
    async (sensorId: any, e: any, p: any) => {
      //   console.log(socket.id, data, e, p);
      const socket = arduinoSockets.arduinoSockets.find(
        (sck) => sck.socketId == socketGlobal.id,
      );

      //   console.log(socket);

      if (socket) {
        try {
          const sensor = await SensorModel.findById(sensorId);

          if (sensor) {
            const isAlreadySubsribed = socket.subscribe.realtimedata.find(
              (sb) => sb == sensorId,
            );
            console.log('isAlreadySubsribed', isAlreadySubsribed);

            if (!isAlreadySubsribed) {
              socket.subscribe.realtimedata.push(sensorId);
              console.log(
                `a user socket with id: ${socketGlobal.id} subscribed their sensor with id: ${sensorId}; realtimedata`,
              );
              const realtimedata = sensor?.data[sensor?.data.length - 1];
              // console.log('realtimedata', realtimedata);
              req.io
                .of('/websocket/arduino')
                .to(socketGlobal.id)
                .emit('arduino.sensor.realtimedata', {
                  sensorId: sensorId,
                  data: realtimedata.data,
                  dateAdded: realtimedata.date,
                  id: realtimedata.id
                });
            }
          }
        } catch (err) {}
      }
    },
  );

  socketGlobal.on('arduino.unsubscribe.allsensor.realtimeData', () => {
    const socket = arduinoSockets.arduinoSockets.find(
      (sck) => sck.socketId == socketGlobal.id,
    );

    if (socket) {
      socket.subscribe.realtimeData = [];
      console.log(
        `a user socket with id: ${socketGlobal.id} unsubscribed their all sensors`,
      );
    }
  });

  socketGlobal.on('error', (err) => {
    console.log(
      `A socket user with socket id: ${socketGlobal.id} has disconnected`,
    );
    const socket = arduinoSockets.arduinoSockets.find(
      (sck) => sck.socketId == socketGlobal.id,
    );

    // console.log(socket, req.arduinoSockets);

    if (socket) {
      // req.arduinoSockets.shift();
      // req.arduinoSockets.shift();
      // req.arduinoSockets.shift();
      // req.arduinoSockets.shift();
      arduinoSockets.arduinoSockets = arduinoSockets.arduinoSockets.filter(
        (socket) => socket.socketId != socketGlobal.id,
      );
      console.log(arduinoSockets);

      // console.log(req.arduinoSockets);
      //   console.log(arduinoSockets);
    }
  });

  socketGlobal.on('disconnect', () => {
    console.log(
      `A socket user with socket id: ${socketGlobal.id} has disconnected`,
    );
    const socket = arduinoSockets.arduinoSockets.find(
      (sck) => sck.socketId == socketGlobal.id,
    );

    // console.log(socket, req.arduinoSockets);

    if (socket) {
      // req.arduinoSockets.shift();
      // req.arduinoSockets.shift();
      // req.arduinoSockets.shift();
      // req.arduinoSockets.shift();
      arduinoSockets.arduinoSockets = arduinoSockets.arduinoSockets.filter(
        (socket) => socket.socketId != socketGlobal.id,
      );
      console.log(arduinoSockets);

      // console.log(req.arduinoSockets);
      //   console.log(arduinoSockets);
    }
  });
}
