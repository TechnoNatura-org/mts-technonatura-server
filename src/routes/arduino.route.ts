/*
 * =================== MTS TECHNONATURA SERVER =================
 *
 * This API Script under MIT LICENSE
 * What is this for ? This is REST API for MTS Technonatura arduino database, user make app and saved the app to db.
 *
 * (c) 2021 by MTS-Technonatura, made with 💖 by Aldhan
 * =============================================================
 */

import * as express from 'express';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';

import ArduinoApp from '../models/Arduino/arduinoApp.model';
import Sensor from '../models/Arduino/Sensors/Sensor';
import { UserBaseDocument } from '../models/User.model';
import SensorsData from '../models/Arduino/Sensors/SensorsData.model';

import { VerifyAuthToken } from '../controllers/checkToken';

import AddArduinoAppRoute from '../controllers/Arduino/app/addApp';
import AddSensorRoute from '../controllers/Arduino/sensor/addSensor';

import sendRealtimeData from '../socket/arduino/realtimeData';
import { arduinoSockets } from '../db/arduinoSockets';
declare module 'express-serve-static-core' {
  interface Request {
    id: string;
    user?: UserBaseDocument | null;
  }
}

interface UserInRequest extends Request {
  user?: UserBaseDocument | null;
}

const ArduinoRouter = express.Router();

ArduinoRouter.use((req, res, next) => {
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept',
  );
  next();
});

ArduinoRouter.post('/apps', VerifyAuthToken, async (req, res) => {
  try {
    const apps = await ArduinoApp.find({ own: req.id });
    res.status(200).send({ apps: apps });
    return;
  } catch (err) {
    res
      .status(200)
      .send({ message: 'error when fetching apps', err: JSON.parse(err) });
  }
});

ArduinoRouter.post('/app', VerifyAuthToken, async (req, res) => {
  const { arduinoAppId } = req.body;

  try {
    const app = await ArduinoApp.findById(arduinoAppId);
    res.status(200).send({ app: app });
  } catch (err) {
    res.status(200).send({ message: 'error when fetching apps' });
  }
});
ArduinoRouter.post('/sensor', VerifyAuthToken, async (req, res) => {
  const { sensorId, appId } = req.body;

  if (sensorId) {
    try {
      const sensor = await Sensor.findById(sensorId).findOne({ appID: appId });

      res.status(200).send({ sensor: sensor });
      return;
    } catch (err) {
      res
        .status(200)
        .send({ message: 'error when fetching apps', status: 'error' });
      return;
    }
  }
  res.status(200).send({ message: 'no sensor id provided', status: 'error' });
  return;
});

ArduinoRouter.use('/add/', AddArduinoAppRoute);

ArduinoRouter.use('/add/sensor', AddSensorRoute);

ArduinoRouter.post(
  '/sensors/',
  VerifyAuthToken,
  /*
   * requires these datas on body:
   * - UserInRequest
   * - authToken
   */

  async (req: UserInRequest, res) => {
    const { arduinoAppId } = req.body;
    const isThereArduinoApp = await ArduinoApp.findById(arduinoAppId);

    if (isThereArduinoApp) {
      try {
        // @ts-ignore
        const sensors = await ArduinoApp.getAllSensors(isThereArduinoApp.id);

        res.status(200).send({ sensors: sensors });
      } catch (err) {
        res
          .status(500)
          .send({ message: 'error when fetching sensors', status: 'error' });
      }
    } else {
      res.status(500).send({ message: 'app not found', status: 'error' });
    }
  },
);

// ===========================================================
// DELETE APP AND SENSORS
// ===========================================================
ArduinoRouter.post('/del/:appID', VerifyAuthToken, async (req, res) => {
  const { appID } = req.params;
  const app = await ArduinoApp.findById(appID);

  // console.log(sensor, req.id);
  if (app && app.own == req.id) {
    try {
      await app.deleteOne();
      await Sensor.find({ appID: appID }).deleteOne();
      res
        .status(200)
        .send({ message: 'arduino app deleted', status: 'success' });
      return;
    } catch (err) {
      res.status(200).send({
        message: 'error when remove app from database',
        status: 'error',
      });
      return;
    }
  } else {
    res.status(200).send({ message: 'app not found', status: 'error' });
    return;
  }
});

ArduinoRouter.post(
  '/del/sensor/:sensorID',
  VerifyAuthToken,
  async (req, res) => {
    const { sensorID } = req.params;
    const sensor = await Sensor.findById(sensorID);

    // console.log(sensor, req.id);
    if (sensor && sensor.own == req.id) {
      try {
        await sensor.deleteOne();
        res.status(200).send({ message: 'success', status: 'success' });
        return;
      } catch (err) {
        res.status(500).send({
          message: 'error when remove sensor from database',
          status: 'success',
        });
        return;
      }
    } else {
      res.status(200).send({ message: 'sensor not found', status: 'warning' });
      return;
    }
  },
);
// ===========================================================
// DELETE APP AND SENSORS
// ===========================================================

// ===========================================================
// UPDATE APP AND SENSORS
// ===========================================================
ArduinoRouter.post('/update/:id', VerifyAuthToken, (req, res) => {});

ArduinoRouter.post(
  '/update/sensor/:sensorID',
  VerifyAuthToken,
  (req, res) => {},
);
ArduinoRouter.post('/add/data/', async (req, res) => {
  const { arduinoAppToken, sensors, realtimeData } = req.body;
  //   console.log(req.body);

  if (!arduinoAppToken) {
    res.status(200).json({ message: 'token not provided', status: 'error' });
    return;
  }

  try {
    // convert jwt
    const verifyToken = await jwt.verify(
      arduinoAppToken,
      process.env.ArduinoApp_SECRET_TOKEN || 'arduinoSecret',
    );

    const arduinoApp = await ArduinoApp.findById(
      // @ts-ignore
      verifyToken.appID,
    );

    if (!arduinoApp) {
      res
        .status(200)
        .json({ message: 'Arduino App Not Found', status: 'error' });
      return;
    }

    if (typeof sensors == 'object' || typeof realtimeData == 'object') {
      try {
        if (sensors) {
          for (const sensor in sensors) {
            const TypeOfSensorData = Number(sensors[sensor]);

            // console.log(isNaN(TypeOfSensorData));
            if (!isNaN(TypeOfSensorData)) {
              const foundSensor = await Sensor.find({
                appID: arduinoApp._id,
              }).findOne({
                name: sensor,
              });
              // console.log(foundSensor, arduinoApp._id, sensor);

              if (foundSensor) {
                const sensorData = new SensorsData({ data: TypeOfSensorData });

                await foundSensor.updateOne({
                  $push: {
                    data: sensorData,
                  },
                });

                arduinoSockets.sendSensorRealtimedataToSocket(
                  req,
                  foundSensor._id,
                  sensorData.data,
                  sensorData.date,
                  sensorData._id
                );
              }
            }
          }
        }

        if (realtimeData) {
          for (const sensor in realtimeData) {
            const SensorRealtimeData = Number(realtimeData[sensor]);

            // console.log(isNaN(SensorData));
            if (!isNaN(SensorRealtimeData)) {
              const foundSensor = await Sensor.find({
                appID: arduinoApp._id,
              }).findOne({
                name: sensor,
              });
              // console.log(foundSensor, arduinoApp._id, sensor);

              if (foundSensor) {
                const now = Date.now();

                await foundSensor.updateOne({
                  realtimeData: {
                    data: SensorRealtimeData,
                    dateAdded: now,
                  },
                });

                // console.log();
                arduinoSockets.sendSensorRealtimeDataToSocket(
                  req,
                  foundSensor._id,
                  SensorRealtimeData,
                  now,
                );
              }
            }
          }
        }

        res
          .status(200)
          .json({ message: 'Success Added Data', status: 'success' });
        return;
      } catch (err) {
        console.log(err);
        res
          .status(200)
          .json({ message: "sensors isn't object", status: 'error' });
        return;
      }
    }
    res
      .status(200)
      .json({ message: 'Please give an sensors input', status: 'error' });
    return;
  } catch (err) {
    res.status(200).json({ message: 'token might expired', status: 'error' });
    return;
  }
});

// ===========================================================
// UPDATE APP AND SENSORS
// ===========================================================

export default ArduinoRouter;
