import {xObject} from "../../types";

export interface MapObject {
  id: string;
  name: string;
  uri: string;
}

export interface MapDrawingObject {
  id: string;
  name: string;
  uri: string;
  reference: xObject;
  target: xObject;
  visible?: boolean;
}
