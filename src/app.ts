import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import { Engine, Scene, Vector3, Mesh, MeshBuilder, CannonJSPlugin, PhysicsImpostor, StandardMaterial, Color3, Ray, RayHelper, ShadowGenerator, DirectionalLight, KeyboardEventTypes, Quaternion, ArcFollowCamera, Texture, SceneLoader, GroundMesh, CubeTexture, HemisphericLight,  } from "@babylonjs/core";
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
            "s" : false,
            "f" : false,
            "r" : false
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
        const gravityVector = new Vector3(0, -9.81, 0);
        scene.enablePhysics(gravityVector, physicsPlugin);

        // objects
        const car_height = 1.4
        const car_width = 2.4
        const car_length = 5.4
        const car: Mesh = MeshBuilder.CreateBox("car", {height: car_height, width: car_width, depth: car_length }, scene);
        car.position.y = 2;

        const ground: GroundMesh = MeshBuilder.CreateGround("ground", {width:1000, height:1000});

        // load the car
        this.loadCarMesh(car);
    
        // scene.createDefaultEnvironment()

        // scene and camera
        const camera: ArcFollowCamera = new ArcFollowCamera("camera", -Math.PI / 2, Math.PI / 6, 50, car, scene);
        camera.attachControl(this._canvas, true);

        const light1: HemisphericLight = new HemisphericLight("light1", new Vector3(0, 1, 0), scene);
        // const light1: DirectionalLight = new DirectionalLight("light1", new Vector3(-1, -2, -1), scene);
        // light1.position = new Vector3(20, 40, 20);
        light1.intensity = 0.5;


        // shadows
        // const shadowGenerator = new ShadowGenerator(1024, light1);
        // shadowGenerator.getShadowMap().renderList.push(car);
        // ground.receiveShadows = true;

        // physics properties
        car.physicsImpostor = new PhysicsImpostor(car, PhysicsImpostor.BoxImpostor, { mass: 1, restitution: 0 }, scene);
        ground.physicsImpostor = new PhysicsImpostor(ground, PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.9 }, scene);
        car.isPickable = false;
        car.isVisible = false;

        // materials
        let groundMaterial = new StandardMaterial("myMaterial", scene);
        groundMaterial.diffuseColor = new Color3(0.3, 0.5, 0.2);
        groundMaterial.specularColor = new Color3(0.5, 0.6, 0.87);
        groundMaterial.emissiveColor = new Color3(0.3, 0.5, 0.2);
        groundMaterial.ambientColor = new Color3(0.23, 0.98, 0.53);
        let texture = new Texture("/assets/textures/grass1.jpg", scene);
        texture.uScale = 100;
        texture.vScale = 100;
	    groundMaterial.diffuseTexture = texture;
	    groundMaterial.emissiveTexture = texture;
	    groundMaterial.ambientTexture = texture;
        ground.material = groundMaterial;

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
                        case "f":
                        case "F":
                            this._keys["f"] = true;
                        break;
                        case "r":
                        case "R":
                            this._keys["r"] = true;
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
                        case "f":
                        case "F":
                            this._keys["f"] = false;
                        break;
                        case "r":
                        case "R":
                            this._keys["r"] = false;
                        break;
                    }
                break;
            }
        });

        // --GAME LOOP--
        const rays = []
        let go = true;
        scene.registerAfterRender(() => {
            // suspension raycast
            const inset = 0.2;

            let fdir = this.getLocalDirection(new Vector3(0, 0, 1), car);
            let rdir = this.getLocalDirection(new Vector3(1, 0, 0), car);
            let ddir = this.getLocalDirection(new Vector3(0, -1, 0), car);

            let car_bottom = car.position.add(ddir.scale(car_height / 2))
            const positions = [];
            positions.push(car_bottom.add(fdir.scale(car_length / 2 - inset)).add(rdir.scale(car_width / 2 - inset))); // FR
            positions.push(car_bottom.add(fdir.scale(car_length / 2 - inset)).subtract(rdir.scale(car_width / 2 - inset))); // FL
            positions.push(car_bottom.subtract(fdir.scale(car_length / 2 - inset)).add(rdir.scale(car_width / 2 - inset))); // BR
            positions.push(car_bottom.subtract(fdir.scale(car_length / 2 - inset)).subtract(rdir.scale(car_width / 2 - inset))); // BL

            const normals = [];
            const comp_ratios = [];

            rays.forEach((ray) => { 
                ray.hide(scene);
            });
            for (let i = 0; i < rays.length; i++) {
                rays.pop();
            }

            // suspension length
            let length = 0.6;
            let grounded = false;
            let ground_fdirs = [];

            positions.forEach((position) => {
                let ray = new Ray(position, ddir, length);
                let rayHelper = new RayHelper(ray);
                rays.push(rayHelper)
		        rayHelper.show(scene);
                // replace with physicsengine raycast later
                let hit = scene.pickWithRay(ray);


                if (hit.pickedMesh) {
                    let k = 5;
                    let b = 1;
                    let comp_ratio = 1 - (Vector3.Distance(position, hit.pickedPoint) / length);
                    let vel = this.getVelocityAtWorldPoint(car, position);
                    let force = ddir.scale(-1 * k * comp_ratio).subtract(vel.scale(b).multiply(new Vector3(0, 1, 0))); // F = -kx - bv
                    car.physicsImpostor.applyForce(force, position.subtract(car.position));

                    normals.push(hit.getNormal());
                    comp_ratios.push(comp_ratio);
                    grounded = true; // maybe change this logic later

                    let ground_fdir = Vector3.Cross(this.getLocalDirection(new Vector3(1, 0, 0), car), hit.getNormal());
                    ground_fdirs.push(ground_fdir);
    
                    let ray = new Ray(position, ground_fdir, 0.5);
                    let rayHelper = new RayHelper(ray);
                    rays.push(rayHelper)
                    rayHelper.show(scene);
                }
                else {
                    normals.push(new Vector3());
                    comp_ratios.push(0);
                }
            });

            // accelerate based on keypressed, todo: align with ground
            if (this._keys["w"]) {
                if (grounded) {
                    let force = ground_fdirs.at(0).scale(30);
                    // car.physicsImpostor.applyForce(force, new Vector3(0, -0.4, -0.2));
                    car.physicsImpostor.applyForce(force, new Vector3(0, -0.1, 0));
                }
            }
            if (this._keys["s"]) {
                if (grounded) {
                    let force = ground_fdirs.at(0).scale(-10);
                    car.physicsImpostor.applyForce(force, new Vector3(0, -0.1, 0));
                }
            }
            if (this._keys["d"]) {
                car.physicsImpostor.physicsBody.applyTorque(new Vector3(0, 5, 0));
            }
            if (this._keys["a"]) {
                car.physicsImpostor.physicsBody.applyTorque(new Vector3(0, -5, 0));
            }

            // flip
            if (this._keys["f"]) {
                let fdir = new Vector3(0,0,1);		
                fdir = this.vecToLocal(fdir, car).subtract(car.position).normalize();
                let rdir = new Vector3(1,0,0);			
                rdir = this.vecToLocal(rdir, car).subtract(car.position).normalize();

                // get random spot in car
                let position = fdir.scale(this.randRange(-2, 2)).add(rdir.scale(this.randRange(-1.5, 1.5)));
                car.physicsImpostor.applyImpulse(new Vector3(0,3,0), position)
            }
            if (this._keys["r"]) {
                car.setAbsolutePosition(new Vector3(0, 1, 0));
                car.rotationQuaternion = new Quaternion();
                car.physicsImpostor.setAngularVelocity(new Vector3());
                car.physicsImpostor.setLinearVelocity(new Vector3());
            }
        });
    }    
    
    public async loadCarMesh(outer) {
        // OBJFileLoader.OPTIMIZE_WITH_UV = true;
        SceneLoader.ImportMeshAsync("", 
            '/assets/karts/rx7/',
            'scene.gltf',
            this._scene
        ).then((result) => {
            const root = result.meshes[0];
            //body is our actual player mesh
            const body = root;
            body.parent = outer;
            body.isPickable = false;
            body.getChildMeshes().forEach(m => {
                m.isPickable = false;
            })
            body.scaling = new Vector3(0.01, 0.01, 0.01);
            body.rotation = new Vector3(0, Math.PI / 2, 0);
            body.position = new Vector3(0, -0.6, 0);
        });
    }

    // helpers
    // private _raycastSuspension(x, y)

    private vecToLocal(vector, mesh): Vector3 {
        let m = mesh.getWorldMatrix();
        let v = Vector3.TransformCoordinates(vector, m);
		return v;		 
    }

    private getLocalDirection(vector, mesh): Vector3 {	
        return this.vecToLocal(vector, mesh).subtract(mesh.position).normalize();
    }

    // point_vel = mesh_vel + (mesh_angular_vel x (pos - mesh_pos))
    private getVelocityAtWorldPoint(mesh, position): Vector3 {
        let result = new Vector3();
        const r = position.subtract(mesh.position);
        result = Vector3.Cross(mesh.physicsImpostor.getAngularVelocity(), r);
        return result.add(mesh.physicsImpostor.getLinearVelocity());
    }

    private randRange(start, end): number {
        return Math.floor(Math.random() * (end - start + 1) + start);
    }
}
new App();