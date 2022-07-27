import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, Mesh, MeshBuilder, CannonJSPlugin, PhysicsImpostor, StandardMaterial, Color3, Ray, RayHelper, PhysicsEngine, ShadowGenerator, DirectionalLight, KeyboardEventTypes,  } from "@babylonjs/core";
import * as CANNON from 'cannon-es'


class App {
    private _scene: Scene;
    private _canvas: HTMLCanvasElement;
    private _engine: Engine;
    private _keys: Object;

    constructor() {
        this._canvas = this._createCanvas();

        // initialize babylon scene and engine
        this._engine = new Engine(this._canvas, true);
        this._scene = new Scene(this._engine);
        this._keys = {
            "a" : false,
            "d" : false,
            "w" : false,
            "s" : false
        }

        const physicsPlugin = new CannonJSPlugin(true, 10, CANNON);
        
        // hide/show the Inspector
        window.addEventListener("keydown", (ev) => {
            // Shift+Ctrl+Alt+I
            if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.keyCode === 73) {
                if (this._scene.debugLayer.isVisible()) {
                    this._scene.debugLayer.hide();
                } else {
                    this._scene.debugLayer.show();
                }
            }
        });

        this._initializeGameAsync(this._scene, physicsPlugin)


        this._main();
    }

    private async _main(): Promise<void> {
        // main render loop
        this._engine.runRenderLoop(() => {
            this._scene.render();
        });
    }

    private _createCanvas(): HTMLCanvasElement {
        document.documentElement.style["overflow"] = "hidden";
        document.documentElement.style.overflow = "hidden";
        document.documentElement.style.width = "100%";
        document.documentElement.style.height = "100%";
        document.documentElement.style.margin = "0";
        document.documentElement.style.padding = "0";
        document.body.style.overflow = "hidden";
        document.body.style.width = "100%";
        document.body.style.height = "100%";
        document.body.style.margin = "0";
        document.body.style.padding = "0";

        //create the canvas html element and attach it to the webpage
        this._canvas = document.createElement("canvas");
        this._canvas.style.width = "100%";
        this._canvas.style.height = "100%";
        this._canvas.id = "gameCanvas";
        document.body.appendChild(this._canvas);

        return this._canvas;
    }

    private async _initializeGameAsync(scene, physicsPlugin): Promise<void> {
        const gravityVector = new Vector3(0,-9.81, 0);
        scene.enablePhysics(gravityVector, physicsPlugin);

        // scene and camera
        const camera: ArcRotateCamera = new ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 15, Vector3.Zero(), scene);
        camera.attachControl(this._canvas, true);
        const light1: DirectionalLight = new DirectionalLight("light1", new Vector3(-1, -2, -1), scene);
        light1.position = new Vector3(20, 40, 20);
        light1.intensity = 0.5;

        // objects
        const car: Mesh = MeshBuilder.CreateBox("car", {height: 1, width: 3, depth: 4 }, scene);
        car.position.y = 2;
        const ground: Mesh = MeshBuilder.CreateGround("ground", {width:100, height:100});

        // shadows
        const shadowGenerator = new ShadowGenerator(1024, light1);
        shadowGenerator.getShadowMap().renderList.push(car);
        ground.receiveShadows = true;

        // physics properties
        car.physicsImpostor = new PhysicsImpostor(car, PhysicsImpostor.BoxImpostor, { mass: 5, restitution: 0.5 }, scene);
        ground.physicsImpostor = new PhysicsImpostor(ground, PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.9 }, scene);
        car.isPickable = false;

        // materials
        let groundMaterial = new StandardMaterial("myMaterial", scene);
        groundMaterial.diffuseColor = new Color3(0.3, 0.5, 0.2);
        groundMaterial.specularColor = new Color3(0.5, 0.6, 0.87);
        groundMaterial.emissiveColor = new Color3(0.3, 0.5, 0.2);
        groundMaterial.ambientColor = new Color3(0.23, 0.98, 0.53);
        ground.material = groundMaterial;

        // flip button
        window.addEventListener("keydown", (ev) => {
            // shift
            if (ev.shiftKey) {
                let udir = new Vector3(0,1,0);			
                udir = this.vecToLocal(udir, car).subtract(car.position).normalize();
                let fdir = new Vector3(0,0,1);		
                fdir = this.vecToLocal(fdir, car).subtract(car.position).normalize();
                let rdir = new Vector3(1,0,0);			
                rdir = this.vecToLocal(rdir, car).subtract(car.position).normalize();

                // get random spot in car
                let position = car.position.add(fdir.scale(this.randRange(-2, 2))).add(rdir.scale(this.randRange(-1.5, 1.5))); // FR

                car.physicsImpostor.applyImpulse(udir.scale(25), position)
            }
        });

        scene.onKeyboardObservable.add((kbInfo) => {
            switch (kbInfo.type) {
                case KeyboardEventTypes.KEYDOWN:
                    switch (kbInfo.event.key) {
                        case "a":
                        case "A":
                            this._keys["a"] = true;
                        break;
                        case "d":
                        case "D":
                            this._keys["d"] = true;
                        break;
                        case "w":
                        case "W":
                            this._keys["w"] = true;
                        break;
                        case "s":
                        case "S":
                            this._keys["s"] = true;
                        break;
                    }
                break;
                case KeyboardEventTypes.KEYUP:
                    switch (kbInfo.event.key) {
                        case "a":
                        case "A":
                            this._keys["a"] = false;
                        break;
                        case "d":
                        case "D":
                            this._keys["d"] = false;
                        break;
                        case "w":
                        case "W":
                            this._keys["w"] = false;
                        break;
                        case "s":
                        case "S":
                            this._keys["s"] = false;
                        break;
                    }
                break;
            }
        });

        // --GAME LOOP--
        scene.registerAfterRender(() => {
            // suspension raycast
            const inset = 0.1;

            let fdir = new Vector3(0,0,1);		
            fdir = this.vecToLocal(fdir, car).subtract(car.position).normalize();
            let rdir = new Vector3(1,0,0);			
            rdir = this.vecToLocal(rdir, car).subtract(car.position).normalize();
            let ddir = new Vector3(0,-1,0);			
            ddir = this.vecToLocal(ddir, car).subtract(car.position).normalize();

            let car_bottom = car.position.add(ddir.scale(0.5))

            // the magic numbers are the length and width of the car / 2, fix later
            const positions = [];
            positions.push(car_bottom.add(fdir.scale(2 - inset)).add(rdir.scale(1.5 - inset))); // FR
            positions.push(car_bottom.add(fdir.scale(2 - inset)).subtract(rdir.scale(1.5 - inset))); // FL
            positions.push(car_bottom.subtract(fdir.scale(2 - inset)).add(rdir.scale(1.5 - inset))); // BR
            positions.push(car_bottom.subtract(fdir.scale(2 - inset)).subtract(rdir.scale(1.5 - inset))); // BL
            // suspension length
            let length = 1;
            positions.forEach((position) => {
                let ray = new Ray(position, ddir, length);
                // let rayHelper = new RayHelper(ray);
		        // rayHelper.show(scene);

                // replace with physicsengine raycast later
                let hit = scene.pickWithRay(ray);
                if (hit.pickedMesh) {
                    let k = 20;
                    let b = 5;
                    let comp_ratio = 1 - (Vector3.Distance(position, hit.pickedPoint) / length);

                    let vel = this.getVelocityAtWorldPoint(car, position);
                    let force = ddir.scale(-1 * k * comp_ratio).subtract(vel.scale(b)); // F = -kx - bv
                    car.physicsImpostor.applyForce(force, position);
                }
            });

            // accelerate based on keypressed, todo: align with ground
            if (this._keys["w"]) {
                car.physicsImpostor.applyForce(fdir.scale(50), car.position);
            }
            if (this._keys["s"]) {
                car.physicsImpostor.applyForce(fdir.scale(-50), car.position);
            }
        });
    }

    // private _raycastSuspension(x, y)

    private vecToLocal(vector, mesh): Vector3 {
        let m = mesh.getWorldMatrix();
        let v = Vector3.TransformCoordinates(vector, m);
		return v;		 
    }

    private getVelocityAtWorldPoint(mesh, position): Vector3 {
        let result = new Vector3();
        const r = position.subtract(mesh.position);
        result = Vector3.Cross(mesh.physicsImpostor.getAngularVelocity(), r);
        result = result.add(mesh.physicsImpostor.getLinearVelocity());
        return result;
    }

    private randRange(start, end): number {
        return Math.floor(Math.random() * (end - start + 1) + start);
    }
}
new App();