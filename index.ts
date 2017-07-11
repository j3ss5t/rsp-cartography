import { BehaviorSubject, Subject } from '@reactivex/rxjs';
import * as uuid from "uuid";
import { rsiLogger } from "../../log";

import { Service, Resource, Element, ResourceUpdate, StatusCode, ElementResponse, CollectionResponse } from "../rsiPlugin";
import { MapObject, MapDrawingObject } from "./schema";

class Cartography extends Service {
  constructor() {
    super();
    this.id = "f9a1064f-e91f-4c56-8468-f4d6bd1d8c96"; //random id
    this.resources.push(new Maps(this));
    this.resources.push(new MapDrawings(this));
  }
}

interface MapElement extends Element {
  data: MapObject;
}

class Maps implements Resource {
  static defaultMapId = "d6ebae92-d2c1-11e6-9376-df943f51f0d8";

  private _name: string;
  private _maps: BehaviorSubject<MapElement>[] = [];
  private _change: BehaviorSubject<ResourceUpdate>;
  private _logger = rsiLogger.getInstance().getLogger("cartography");

  constructor(private service: Service) {
    let defaultMap = new BehaviorSubject<MapElement>({
      lastUpdate: Date.now(),
      propertiesChanged: [],
      data: {
        uri: "/" + this.service.name.toLowerCase() + "/" + this.name.toLowerCase() + "/" + Maps.defaultMapId,
        id: Maps.defaultMapId,
        name: "default"
      }
    });
    this._maps.push(defaultMap);

    this._change = new BehaviorSubject(<ResourceUpdate>{ lastUpdate: Date.now(), action: 'init' });
  }

  get name(): string {
    return this.constructor.name;
  };

  get elementSubscribable(): Boolean {
    return true;
  };

  get change(): BehaviorSubject<ResourceUpdate> {
    return this._change;
  }

  getElement(elementId: string): ElementResponse {
    // find the element requested by the client
    return {
      status: "ok",
      data: this._maps.find((element: BehaviorSubject<MapElement>) => {
        return (<{ id: string }>element.getValue().data).id === elementId;
      })
    };
  };

  getResource(offset?: string | number, limit?: string | number): CollectionResponse {
    // retriev all element
    let resp: BehaviorSubject<MapElement>[];

    if ((typeof offset === "number" && typeof limit === "number") || (typeof limit === "number" && !offset) || (typeof offset === "number" && !limit) || (!offset && !limit)) {
      resp = this._maps.slice(<number>offset, <number>limit);
    }

    return { status: "ok", data: resp };
  };
}

interface MapDrawingElement extends Element {
  data: MapDrawingObject;
}

class MapDrawings implements Resource {
  private _name: string;
  private _mapDrawings: BehaviorSubject<MapDrawingElement>[] = [];
  private _change: BehaviorSubject<ResourceUpdate>;
  private _logger = rsiLogger.getInstance().getLogger("cartography");

  constructor(private service: Service) {
    this._change = new BehaviorSubject(<ResourceUpdate>{ lastUpdate: Date.now(), action: 'init' });
  }

  get name(): string {
    return this.constructor.name;
  };

  get elementSubscribable(): Boolean {
    return true;
  };

  get change(): BehaviorSubject<ResourceUpdate> {
    return this._change;
  }

  getElement(elementId: string): ElementResponse {
    // find the element requested by the client
    return {
      status: "ok",
      data: this._mapDrawings.find((element: BehaviorSubject<MapDrawingElement>) => {
        return (<{ id: string }>element.getValue().data).id === elementId;
      })
    };
  };

  getResource(offset?: string | number, limit?: string | number): CollectionResponse {
    // retriev all element
    let resp: BehaviorSubject<MapDrawingElement>[];

    if ((typeof offset === "number" && typeof limit === "number") || (typeof limit === "number" && !offset) || (typeof offset === "number" && !limit) || (!offset && !limit)) {
      resp = this._mapDrawings.slice(<number>offset, <number>limit);
    }

    return { status: "ok", data: resp };
  };

  updateElement(elementId: string, difference: any): ElementResponse {
    let element = (<BehaviorSubject<MapDrawingElement>>this.getElement(elementId).data);
    var mapDrawing : MapDrawingObject = element.getValue().data;
    let propertiesChanged: string[] = [];

    if (!difference.hasOwnProperty("visible")) return {
      status: "error",
      error: new Error('providing a visible is mandatory'),
      code: StatusCode.INTERNAL_SERVER_ERROR
    };

    if (difference.hasOwnProperty("visible")) {
      if (-1 !== ["off", "one", "all"].indexOf(difference.repeat)) {
        mapDrawing.visible = difference.visible;
        propertiesChanged.push("visible");
      }
    }

    let resp = {
      lastUpdate: Date.now(),
      propertiesChanged: propertiesChanged,
      data: mapDrawing
    };
    element.next(resp); // @TODO: check diffs bevor updating without a need
    return { status: "ok" };
  };

  createElement(state:any) : ElementResponse {
    if (!state.name) return {
      status: "error",
      error: new Error('providing a name is mandatory'),
      code: StatusCode.INTERNAL_SERVER_ERROR
    };

    if (!state.target) return {
      status: "error",
      error: new Error('providing a target is mandatory'),
      code: StatusCode.INTERNAL_SERVER_ERROR
    };

    if (!state.reference) return {
      status: "error",
      error: new Error('providing a reference is mandatory'),
      code: StatusCode.INTERNAL_SERVER_ERROR
    };

    const mapDrawingsId = uuid.v1();

    /** build the actual location and add it to the collections*/
    let newMapDrawing = new BehaviorSubject<MapDrawingElement>(
      {
        lastUpdate: Date.now(),
        propertiesChanged: [],
        data: {
          uri: "/" + this.service.name.toLowerCase() + "/" + this.name.toLowerCase() + "/" + mapDrawingsId,
          id: mapDrawingsId,
          name: state.name,
          reference: state.reference,
          target: state.target,
          visible: true
        }
      });
    this._mapDrawings.push(newMapDrawing);

    /** publish a resource change */
    this._change.next({lastUpdate: Date.now(), action: "add"});

    /** return success */
    return {status:"ok", data: newMapDrawing};
  };

  deleteElement(elementId:string):ElementResponse {
    let idx = this._mapDrawings.findIndex((element:BehaviorSubject<MapDrawingElement>, index:number) => {
      return  (<{id:string}>element.getValue().data).id === elementId;
    });
    if (-1 !== idx) {
      this._mapDrawings.splice(idx, 1); //remove one item from the collections array
      return {status: "ok"};
    }
    return {status: "error", code: 404, message: "Element can not be found"};
  };
}

export {Cartography as Service};
