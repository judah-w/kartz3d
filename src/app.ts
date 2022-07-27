import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, Mesh, MeshBuilder, CannonJSPlugin, PhysicsImpostor, StandardMaterial, Color3, Ray, RayHelper,  } from "@babylonjs/core";
import * as CANNON from 'cannon-es'


class App {
    private _scene: Scene;
    private _canvas: HTMLCanvasElement;
    private _engine: Engine;

    constructor() {
        this._canvas = this._createCanvas();

        // initialize babylon scene and engine
        this._engine = new Engine(this._canvas, true);
        this._scene = new Scene(this._engine);

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
        const light1: HemisphericLight = new HemisphericLight("light1", new Vector3(1, 1, 0), scene);

        // objects
        const car: Mesh = MeshBuilder.CreateBox("car", {height: 1, width: 3, depth: 4 }, scene);
        car.position.y = 4;
        const ground: Mesh = MeshBuilder.CreateGround("ground", {width:100, height:100});

        // physics properties
        car.physicsImpostor = new PhysicsImpostor(car, PhysicsImpostor.BoxImpostor, { mass: 20, restitution: 0.9 }, scene);
        ground.physicsImpostor = new PhysicsImpostor(ground, PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.9 }, scene);
        car.isPickable = false;

        // materials
        let groundMaterial = new StandardMaterial("myMaterial", scene);
        groundMaterial.diffuseColor = new Color3(0.3, 0.5, 0.2);
        groundMaterial.specularColor = new Color3(0.5, 0.6, 0.87);
        groundMaterial.emissiveColor = new Color3(0.3, 0.5, 0.2);
        groundMaterial.ambientColor = new Color3(0.23, 0.98, 0.53);
        ground.material = groundMaterial;

        //--GAME LOOP--
        scene.onBeforeRenderObservable.add(() => {
            // suspension raycast
            const inset = 0;

            let fdir = new Vector3(0,0,1);		
            fdir = this.vecToLocal(fdir, car).subtract(car.position).normalize();
            let rdir = new Vector3(1,0,0);			
            rdir = this.vecToLocal(rdir, car).subtract(car.position).normalize();
            let ddir = new Vector3(0,-1,0);			
            ddir = this.vecToLocal(ddir, car).subtract(car.position).normalize();

            let car_bottom = car.position.add(ddir.scale(0.5))

            // the magic numbers are the length and width of the car / 2, fix later
            let positions = [];
            positions.push(car_bottom.add(fdir.scale(2 - inset)).add(rdir.scale(1.5 - inset))); // FR
            positions.push(car_bottom.add(fdir.scale(2 - inset)).subtract(rdir.scale(1.5 - inset))); // FL
            positions.push(car_bottom.subtract(fdir.scale(2 - inset)).add(rdir.scale(1.5 - inset))); // BR
            positions.push(car_bottom.subtract(fdir.scale(2 - inset)).subtract(rdir.scale(1.5 - inset))); // BL
            // suspension length
            let length = 0.1;
            positions.forEach((position) => {
                let ray = new Ray(position, ddir, length);
                let rayHelper = new RayHelper(ray);		
		        rayHelper.show(scene);

                // replace with physicsengine raycast later
                let hit = scene.pickWithRay(ray);
                if (hit.pickedMesh) {
                    let comp_ratio = 1 - (Vector3.Distance(position, hit.pickedPoint) / length);
                    car.physicsImpostor.applyForce(ddir.scale(-20 * comp_ratio), position);
                }
            });
        });
    }

    // private _raycastSuspension(x, y)

    private vecToLocal(vector, mesh): Vector3{
        let m = mesh.getWorldMatrix();
        let v = Vector3.TransformCoordinates(vector, m);
		return v;		 
    }
}
new App();