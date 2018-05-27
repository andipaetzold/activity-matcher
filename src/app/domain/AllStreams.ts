import { AltitudeStream } from 'app/domain/AltitudeStream';
import { HeartrateStream } from 'app/domain/HeartrateStream';
import { LatLngStream } from 'app/domain/LatLngStream';
import { TimeStream } from 'app/domain/TimeStream';
import { SmoothVelocityStream } from 'app/domain/SmoothVelocityStream';
import { DistanceStream } from 'app/domain/DistanceStream';

export type AllStreams = (AltitudeStream | HeartrateStream | LatLngStream | TimeStream | SmoothVelocityStream | DistanceStream)[];