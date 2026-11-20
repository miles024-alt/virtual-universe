(() => {
  "use strict";

  const canvas = document.querySelector("#world");
  const gl = canvas.getContext("webgl", { antialias: true, alpha: false });
  const landing = document.querySelector("#landing");
  const panel = document.querySelector("#creator-panel");
  const toast = document.querySelector("#toast");
  const mapCanvas = document.querySelector("#map");
  const mapContext = mapCanvas.getContext("2d");
  const $ = (selector) => document.querySelector(selector);
  if (!gl) {
    landing.innerHTML = '<div class="landing-content"><div class="landing-title">OMNI<span>VERSE</span></div><p>This browser does not support WebGL. Try a current version of Chrome, Edge, Firefox or Safari.</p></div>';
    return;
  }

  const vertexSource = `
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    uniform mat4 uViewProjection;
    uniform mat4 uModel;
    uniform mat3 uNormalMatrix;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    void main() {
      vec4 worldPosition = uModel * vec4(aPosition, 1.0);
      vWorldPosition = worldPosition.xyz;
      vNormal = normalize(uNormalMatrix * aNormal);
      gl_Position = uViewProjection * worldPosition;
    }
  `;
  const fragmentSource = `
    precision mediump float;
    uniform vec3 uColor;
    uniform vec3 uCameraPosition;
    uniform vec3 uFogColor;
    uniform vec3 uLightDirection;
    uniform float uSun;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    void main() {
      vec3 normal = normalize(vNormal);
      vec3 lightDirection = normalize(uLightDirection);
      vec3 viewDirection = normalize(uCameraPosition - vWorldPosition);
      vec3 halfDirection = normalize(lightDirection + viewDirection);
      float diffuse = max(dot(normal, lightDirection), 0.0);
      float skyFill = 0.24 + 0.16 * max(normal.y, 0.0);
      float specular = pow(max(dot(normal, halfDirection), 0.0), 28.0) * diffuse * uSun * 0.18;
      float surfaceVariation = 0.97 + 0.03 * sin(dot(vWorldPosition, vec3(1.71, 2.13, 1.37)));
      vec3 color = uColor * (skyFill + diffuse * uSun * 0.76) * surfaceVariation;
      color += vec3(0.78, 0.86, 0.88) * specular;
      float distanceToCamera = distance(vWorldPosition, uCameraPosition);
      float fog = smoothstep(75.0, 150.0, distanceToCamera);
      gl_FragColor = vec4(mix(color, uFogColor, fog), 1.0);
    }
  `;

  function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader) || "Shader compilation failed");
    }
    return shader;
  }

  let program;
  try {
    program = gl.createProgram();
    gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || "WebGL program link failed");
    }
  } catch (error) {
    landing.innerHTML = `<div class="landing-content"><div class="landing-title">OMNI<span>VERSE</span></div><p>Could not start the browser renderer: ${error.message}</p></div>`;
    return;
  }

  const attributes = {
    position: gl.getAttribLocation(program, "aPosition"),
    normal: gl.getAttribLocation(program, "aNormal"),
  };
  const uniforms = {
    viewProjection: gl.getUniformLocation(program, "uViewProjection"),
    model: gl.getUniformLocation(program, "uModel"),
    normalMatrix: gl.getUniformLocation(program, "uNormalMatrix"),
    color: gl.getUniformLocation(program, "uColor"),
    cameraPosition: gl.getUniformLocation(program, "uCameraPosition"),
    fogColor: gl.getUniformLocation(program, "uFogColor"),
    lightDirection: gl.getUniformLocation(program, "uLightDirection"),
    sun: gl.getUniformLocation(program, "uSun"),
  };

  function makeMesh(positions, normals) {
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
    return { positionBuffer, normalBuffer, count: positions.length / 3 };
  }

  function boxMesh() {
    const p = [], n = [];
    const faces = [
      [[1,0,0], [[.5,-.5,-.5],[.5,-.5,.5],[.5,.5,.5],[.5,.5,-.5]]],
      [[-1,0,0], [[-.5,-.5,.5],[-.5,-.5,-.5],[-.5,.5,-.5],[-.5,.5,.5]]],
      [[0,1,0], [[-.5,.5,-.5],[.5,.5,-.5],[.5,.5,.5],[-.5,.5,.5]]],
      [[0,-1,0], [[-.5,-.5,.5],[.5,-.5,.5],[.5,-.5,-.5],[-.5,-.5,-.5]]],
      [[0,0,1], [[.5,-.5,.5],[-.5,-.5,.5],[-.5,.5,.5],[.5,.5,.5]]],
      [[0,0,-1], [[-.5,-.5,-.5],[.5,-.5,-.5],[.5,.5,-.5],[-.5,.5,-.5]]],
    ];
    for (const [normal, vertices] of faces) {
      for (const index of [0,1,2,0,2,3]) {
        p.push(...vertices[index]);
        n.push(...normal);
      }
    }
    return makeMesh(p, n);
  }

  function sphereMesh(rows = 14, columns = 20) {
    const p = [], n = [];
    for (let row = 0; row < rows; row++) {
      const a0 = Math.PI * row / rows, a1 = Math.PI * (row + 1) / rows;
      for (let column = 0; column < columns; column++) {
        const b0 = Math.PI * 2 * column / columns, b1 = Math.PI * 2 * (column + 1) / columns;
        const point = (a, b) => [Math.sin(a) * Math.cos(b), Math.cos(a), Math.sin(a) * Math.sin(b)];
        const quad = [point(a0,b0), point(a1,b0), point(a1,b1), point(a0,b1)];
        for (const index of [0,1,2,0,2,3]) {
          p.push(...quad[index]);
          n.push(...quad[index]);
        }
      }
    }
    return makeMesh(p, n);
  }

  function cylinderMesh(segments = 16, topRadius = 1) {
    const p = [], n = [];
    const pushTriangle = (a, b, c, normal) => {
      for (const point of [a, b, c]) { p.push(...point); n.push(...normal); }
    };
    for (let i = 0; i < segments; i++) {
      const a0 = Math.PI * 2 * i / segments, a1 = Math.PI * 2 * (i + 1) / segments;
      const b0 = [Math.cos(a0), -.5, Math.sin(a0)];
      const b1 = [Math.cos(a1), -.5, Math.sin(a1)];
      const t0 = [topRadius * Math.cos(a0), .5, topRadius * Math.sin(a0)];
      const t1 = [topRadius * Math.cos(a1), .5, topRadius * Math.sin(a1)];
      const normal0 = [Math.cos(a0), 0, Math.sin(a0)];
      const normal1 = [Math.cos(a1), 0, Math.sin(a1)];
      for (const point of [b0,t0,t1,b0,t1,b1]) {
        const normal = point === b0 ? normal0 : normal1;
        p.push(...point); n.push(...normal);
      }
      pushTriangle([0,-.5,0], b1, b0, [0,-1,0]);
      if (topRadius > 0) pushTriangle([0,.5,0], t0, t1, [0,1,0]);
    }
    return makeMesh(p, n);
  }

  function latheMesh(profile, segments = 24) {
    const positions = [], normals = [];
    for (let ring = 0; ring < profile.length - 1; ring++) {
      const current = profile[ring], next = profile[ring + 1];
      const slope = (next[1] - current[1]) / Math.max(next[0] - current[0], 0.001);
      for (let segment = 0; segment < segments; segment++) {
        const angles = [segment * Math.PI * 2 / segments, (segment + 1) * Math.PI * 2 / segments];
        const points = angles.map((angle) => [
          [[Math.cos(angle) * current[1], current[0], Math.sin(angle) * current[2]], angle],
          [[Math.cos(angle) * next[1], next[0], Math.sin(angle) * next[2]], angle],
        ]);
        const face = [points[0][0], points[0][1], points[1][1], points[0][0], points[1][1], points[1][0]];
        for (const [point, angle] of face) {
          positions.push(...point);
          const normal = normalize([Math.cos(angle), -slope, Math.sin(angle)]);
          normals.push(...normal);
        }
      }
    }
    return makeMesh(positions, normals);
  }

  const meshes = {
    box: boxMesh(),
    sphere: sphereMesh(20, 32),
    cylinder: cylinderMesh(20),
    cone: cylinderMesh(20, 0.035),
  };
  gl.useProgram(program);
  gl.enable(gl.DEPTH_TEST);

  const avatarParts = [];
  const avatarMaterials = {
    skin: [0.48,0.245,0.16],
    lips: [0.38,0.10,0.09],
    eyes: [0.045,0.018,0.009],
    white: [0.85,0.81,0.75],
    hair: [0.025,0.012,0.009],
    cloth: [0.025,0.035,0.05],
    shoes: [0.015,0.015,0.018],
  };
  const humanCylinderMeshes = new Map();

  function addHumanSphere(name, position, scale, material, group="", side=0, feature="") {
    avatarParts.push({
      name, kind: "sphere", position, scale,
      color: avatarMaterials[material], materialKey: material, group, side, feature,
    });
  }

  function addHumanCylinder(name, start, end, radius, material, group="", side=0, vertices=24, radiusEnd=null) {
    const startRadius = radiusEnd === null ? radius : radiusEnd;
    const ratio = radius / startRadius;
    const key = `${vertices}:${ratio.toFixed(5)}`;
    if (!humanCylinderMeshes.has(key)) {
      humanCylinderMeshes.set(key, cylinderMesh(vertices, ratio));
    }
    avatarParts.push({
      name, kind: "cylinder", start, end, startRadius,
      mesh: humanCylinderMeshes.get(key), color: avatarMaterials[material],
      materialKey: material, group, side,
    });
  }

  function buildReferenceHuman() {
    const sphere = addHumanSphere;
    const cylinder = addHumanCylinder;
    const SKIN="skin", LIPS="lips", EYES="eyes", WHITE="white", HAIR="hair", CLOTH="cloth", SHOES="shoes";

    sphere("Head | Skull",[0,0,1.64],[.115,.105,.145],SKIN,"head");
    sphere("Jaw",[0,-.005,1.555],[.088,.09,.075],SKIN,"head");
    sphere("Chin",[0,-.045,1.535],[.05,.055,.035],SKIN,"head");
    cylinder("Neck",[0,0,1.39],[0,0,1.55],.045,SKIN,"chest",0,24,.055);
    sphere("Upper Torso",[0,0,1.31],[.205,.105,.16],SKIN,"chest");
    sphere("Chest",[0,-.01,1.22],[.175,.10,.105],SKIN,"chest");
    for (const side of [-1,1]) {
      sphere("Chest Volume",[side*.085,-.085,1.245],[.083,.045,.075],SKIN,"chest",side);
    }
    sphere("Abdomen",[0,0,1.08],[.145,.09,.15],SKIN,"spine");
    sphere("Pelvis",[0,0,.93],[.18,.105,.105],SKIN,"pelvis");

    for (const side of [-1,1]) {
      sphere("Shoulder",[side*.215,0,1.35],[.075,.075,.075],SKIN,"chest",side);
      cylinder("Upper Arm",[side*.23,0,1.34],[side*.29,0,1.13],.048,SKIN,"upper_arm",side,24,.038);
      sphere("Elbow",[side*.29,0,1.13],[.039,.04,.04],SKIN,"upper_arm",side);
      cylinder("Forearm",[side*.29,0,1.12],[side*.32,-.005,.91],.038,SKIN,"forearm",side,24,.025);
      sphere("Wrist",[side*.32,0,.90],[.027,.027,.027],SKIN,"hand",side);
      sphere("Palm",[side*.325,-.015,.855],[.052,.028,.065],SKIN,"hand",side);
      for (let finger=0; finger<4; finger++) {
        const offset=(finger-1.5)*.022;
        const start=[side*.325+offset,-.02,.82];
        const end=[side*.325+offset,-.025,.765];
        cylinder("Finger",start,end,.009,SKIN,"hand",side,12);
        sphere("Fingertip",end,[.009,.009,.012],SKIN,"hand",side);
      }
      cylinder("Thumb",[side*.29,-.025,.86],[side*.265,-.04,.82],.012,SKIN,"hand",side,12);
    }

    for (const side of [-1,1]) {
      sphere("Hip",[side*.105,0,.91],[.09,.09,.105],SKIN,"thigh",side);
      cylinder("Thigh",[side*.105,0,.92],[side*.11,0,.53],.075,SKIN,"thigh",side,24,.052);
      sphere("Knee",[side*.11,-.005,.51],[.052,.06,.055],SKIN,"thigh",side);
      cylinder("Lower Leg",[side*.11,0,.50],[side*.105,0,.12],.052,SKIN,"shin",side,24,.029);
      sphere("Ankle",[side*.105,0,.105],[.031,.034,.04],SKIN,"foot",side);
      sphere("Foot",[side*.105,-.055,.055],[.052,.12,.045],SKIN,"foot",side);
      for (let toe=0; toe<5; toe++) {
        const offset=(toe-2)*.017;
        sphere("Toe",[side*.105+offset,-.145,.05],[.012,.035,.018],SKIN,"foot",side);
      }
    }

    for (const side of [-1,1]) {
      const x=side*.046;
      sphere("Eye Socket",[x,-.092,1.674],[.035,.021,.023],SKIN,"head",side);
      sphere("Eyeball",[x,-.108,1.674],[.026,.014,.016],WHITE,"head",side,"eye");
      sphere("Iris",[x,-.121,1.674],[.011,.006,.012],EYES,"head",side,"eye");
      sphere("Eyebrow",[x,-.108,1.706],[.033,.009,.008],HAIR,"head",side,"brow");
    }
    sphere("Nose Bridge",[0,-.105,1.655],[.021,.035,.052],SKIN,"head");
    sphere("Nose Tip",[0,-.137,1.632],[.025,.025,.018],SKIN,"head");
    for (const side of [-1,1]) {
      sphere("Nostril",[side*.015,-.151,1.625],[.008,.007,.006],HAIR,"head",side);
    }
    sphere("Upper Lip",[0,-.105,1.594],[.034,.012,.009],LIPS,"head",0,"mouth");
    sphere("Lower Lip",[0,-.106,1.581],[.03,.012,.009],LIPS,"head",0,"mouth");
    for (const side of [-1,1]) {
      sphere("Ear",[side*.115,0,1.635],[.022,.03,.045],SKIN,"head",side);
    }

    sphere("Hair Cap",[0,.005,1.72],[.12,.11,.075],HAIR,"head");
    sphere("Back Hair",[0,.065,1.61],[.115,.065,.14],HAIR,"head");
    for (const side of [-1,1]) {
      cylinder("Hair Lock",[side*.09,.015,1.70],[side*.12,.025,1.49],.025,HAIR,"head",side,16,.015);
    }

    sphere("Clothing Top",[0,.002,1.29],[.19,.108,.105],CLOTH,"chest");
    sphere("Waist Clothing",[0,0,.96],[.178,.108,.09],CLOTH,"pelvis");
    for (const side of [-1,1]) {
      cylinder("Trouser Leg",[side*.105,0,.92],[side*.11,0,.53],.078,CLOTH,"thigh",side,32,.055);
      sphere("Shoe",[side*.105,-.06,.04],[.055,.12,.04],SHOES,"foot",side);
    }
  }

  buildReferenceHuman();

  function addMesh(type, position, scale, color, rotation = 0, collider = false) {
    const object = { type, position, scale, color, rotation };
    objects.push(object);
    if (collider) blockers.push({
      x: position[0], y: position[1], z: position[2],
      hx: Math.abs(scale[0]) / 2, hy: Math.abs(scale[1]) / 2, hz: Math.abs(scale[2]) / 2,
    });
    return object;
  }

  const objects = [];
  const blockers = [];
  const colors = {
    grass: [0.26,0.42,0.23], stone: [0.55,0.55,0.51], road: [0.12,0.15,0.17],
    line: [0.82,0.79,0.68], water: [0.08,0.34,0.48], sand: [0.69,0.59,0.40],
    wood: [0.29,0.16,0.09], leaf: [0.10,0.34,0.19], roof: [0.16,0.22,0.28],
    cream: [0.72,0.69,0.59], orange: [0.65,0.28,0.13], glass: [0.20,0.48,0.58],
    white: [0.77,0.78,0.72], gold: [0.70,0.50,0.18],
  };
  const box = (name, x, y, z, sx, sy, sz, color, collider = false, rotation = 0) =>
    addMesh("box", [x,y,z], [sx,sy,sz], color, rotation, collider);
  const cylinder = (name, x, y, z, radius, height, color) =>
    addMesh("cylinder", [x,y,z], [radius*2,height,radius*2], color);
  const cone = (name, x, y, z, radius, height, color) =>
    addMesh("cone", [x,y,z], [radius*2,height,radius*2], color);
  const sphere = (name, x, y, z, radius, color, sy = radius) =>
    addMesh("sphere", [x,y,z], [radius*2,sy*2,radius*2], color);

  function makeHouse(name, x, z, color, roof = colors.roof) {
    box(name, x, 3.2, z, 7, 6.4, 6, color, true);
    box(`${name} roof`, x, 6.55, z, 7.7, .45, 6.7, roof);
    for (const windowX of [-2.1, 2.1]) {
      box(`${name} window`, x+windowX, 3.9, z-3.06, 1.3, 1.45, .08, colors.glass);
      box(`${name} lower window`, x+windowX, 1.9, z-3.06, 1.3, 1.05, .08, colors.glass);
    }
    box(`${name} door`, x, 1.25, z-3.1, 1.15, 2.5, .12, colors.wood);
    box(`${name} door glass`, x, 1.72, z-3.17, .58, .62, .025, [0.23,0.45,0.49]);
    sphere(`${name} door handle`, x+.39, 1.2, z-3.2, .055, colors.gold, .055);
    box(`${name} entry step`, x, .13, z-3.42, 1.65, .26, .72, [0.49,0.48,0.43]);
  }

  function makeTree(x, z, size = 1) {
    cylinder("tree trunk", x, 1.5*size, z, .24*size, 3*size, colors.wood);
    sphere("tree canopy", x, 3.55*size, z, 1.4*size, colors.leaf, 1.55*size);
    sphere("tree canopy", x-.72*size, 4.0*size, z+.12*size, .91*size, [0.13,0.39,0.22], 1.08*size);
    sphere("tree canopy", x+.67*size, 3.95*size, z-.12*size, .95*size, [0.16,0.41,0.23], 1.03*size);
    sphere("tree canopy", x, 4.55*size, z, .98*size, [0.18,0.43,0.24], 1.15*size);
  }

  function makeStreetlight(x,z) {
    cylinder("streetlight post",x,2.4,z,.075,4.8,[0.19,0.23,0.23]);
    box("streetlight arm",x+.37,4.67,z,.82,.09,.10,[0.19,0.23,0.23]);
    sphere("streetlight",x+.72,4.55,z,.16,[0.92,.70,.34],.11);
  }

  function makeBench(x,z) {
    box("bench seat",x,.56,z,1.8,.14,.48,[.34,.23,.14]);
    box("bench back",x,1.0,z+.20,1.8,.72,.12,[.38,.26,.16]);
    for (const dx of [-.68,.68]) {
      box("bench leg",x+dx,.28,z,.12,.55,.13,[.15,.18,.18]);
    }
  }

  // Ground, avenues and the central plaza.
  box("island ground", 0,-.55,0, 160,1,160, colors.grass);
  box("north-south avenue", 0,.025,0, 8,.05,108, colors.road);
  box("east-west avenue", 0,.03,0, 108,.06,8, colors.road);
  box("north avenue sidewalk",5.2,.045,0,2.0,.09,105,[.48,.49,.44]);
  box("south avenue sidewalk",-5.2,.045,0,2.0,.09,105,[.48,.49,.44]);
  box("east avenue sidewalk",0,.05,5.2,105,.10,2.0,[.48,.49,.44]);
  box("west avenue sidewalk",0,.05,-5.2,105,.10,2.0,[.48,.49,.44]);
  for (let z = -48; z <= 48; z += 12) box("road dash", 0,.07,z, .12,.025,4, colors.line);
  for (let x = -48; x <= 48; x += 12) box("road dash", x,.075,0, 4,.025,.12, colors.line);
  for (const z of [-14,14]) for (let x = -3.2; x <= 3.2; x += 1.3) {
    box("pedestrian crossing",x,.075,z,.72,.025,.42,[0.84,0.82,0.74]);
  }
  for (const x of [-14,14]) for (let z = -3.2; z <= 3.2; z += 1.3) {
    box("pedestrian crossing",x,.075,z,.42,.025,.72,[0.84,0.82,0.74]);
  }
  for (const offset of [-4.18,4.18]) {
    box("avenue curb",offset,.11,0,.24,.22,108,[0.68,0.68,0.62]);
    box("avenue curb",0,.11,offset,108,.22,.24,[0.68,0.68,0.62]);
  }
  for (const z of [-42,-24,24,42]) {
    makeStreetlight(-6.5,z);
    makeStreetlight(6.5,z);
  }
  for (const x of [-42,-24,24,42]) {
    makeStreetlight(x,-6.5);
    makeStreetlight(x,6.5);
  }
  box("central plaza", 0,.075,0, 18,.14,18, colors.stone);
  box("fountain base", 0,.25,0, 5,.4,5, colors.white);
  cylinder("fountain pool", 0,.54,0, 2.0,.22, colors.water);
  cylinder("fountain pedestal", 0,.95,0, .38,.7, colors.stone);
  sphere("fountain crown", 0,1.42,0, .22, colors.water);
  makeBench(-6.1,-5.6);
  makeBench(6.1,5.6);
  for (const x of [-7.2,7.2]) for (const z of [-7.2,7.2]) {
    cylinder("plaza bollard",x,.42,z,.12,.84,[.23,.27,.25]);
  }
  box("plaza path to homes",-18,.045,-18,28,.09,2.4,[.48,.48,.42]);
  box("plaza path to market",18,.05,-18,28,.10,2.4,[.48,.48,.42]);
  box("coastal promenade",-18,.06,43,82,.12,2.6,[.57,.53,.44]);

  // Residential and commercial districts.
  makeHouse("residence 01", -24,-20, colors.cream, [0.29,0.18,0.13]);
  makeHouse("residence 02", -39,-20, [0.61,0.67,0.60], [0.24,0.24,0.22]);
  makeHouse("residence 03", -24,-36, [0.75,0.66,0.51], [0.32,0.20,0.12]);
  makeHouse("residence 04", -39,-36, [0.71,0.73,0.67], [0.20,0.27,0.29]);
  box("market hall", 24,3.8,-20, 13,7.6,11, colors.orange, true);
  box("market roof", 24,7.8,-20, 14, .5,12, colors.roof);
  box("market awning",24,2.5,-25.72,12,.20,.75,[.78,.65,.43]);
  for (let x = 19; x <= 29; x += 5) box("market window", x,3.7,-25.58,3.2,2.9,.08,colors.glass);
  box("market entrance",24,1.35,-25.68,1.8,2.7,.16,colors.wood);
  box("market entrance glass",24,1.55,-25.78,1.28,1.65,.025,[0.28,0.53,0.56]);
  box("market sign",24,6.35,-25.63,7.6,.9,.18,[0.79,0.68,0.48]);
  box("market sign inset",24,6.35,-25.74,6.9,.56,.035,[0.13,0.25,0.25]);
  for (const x of [17,31]) {
    box("market planter",x,.42,-27.1,1.45,.84,.9,[0.34,0.29,0.22]);
    sphere("market planter foliage",x,1.05,-27.1,.55,[0.17,0.35,0.23],.62);
  }
  box("office tower", 41,8,-25, 10,16,11, colors.glass, true);
  box("office roof", 41,16.3,-25, 10.7,.6,11.7, colors.roof);
  for (let y = 2; y <= 14; y += 3) {
    for (const x of [38.2,41,43.8]) box("office facade glazing",x,y,-30.58,2.35,1.45,.06,[0.25,0.55,0.64]);
  }
  for (let y = 2.4; y <= 14.4; y += 3) box("office facade mullion",41,y,-30.64,.12,1.65,.08,[0.32,0.37,0.38]);
  box("office entrance",41,1.35,-30.65,2.3,2.7,.14,[0.13,0.22,0.25]);
  box("office entrance glazing",41,1.55,-30.74,1.75,1.8,.035,[0.35,0.58,0.62]);
  box("workshop", 25,2.8,-39, 14,5.6,9, colors.stone, true);
  box("workshop roof", 25,5.9,-39, 14.8,.5,9.8, colors.roof);
  for (const x of [21,25,29]) box("workshop window",x,3.2,-43.58,2.4,1.4,.08,[0.26,0.43,0.46]);
  box("workshop rollup door",25,1.7,-43.65,3.6,3.4,.12,[0.24,0.29,0.30]);
  for (let y = .4; y < 3.3; y += .42) box("workshop door seam",25,y,-43.72,3.4,.035,.025,[0.39,0.43,0.42]);

  // Public spaces, coastline, forest and distant mountains.
  box("coast beach", -18,.035,48, 130,.07,8, colors.sand);
  box("coastal water", -18,-.08,69, 130,.16,34, colors.water);
  for (let i = 0; i < 21; i++) {
    const angle = Math.PI * 2 * i / 21, radius = 52 + (i % 3) * 4;
    makeTree(Math.cos(angle)*radius, Math.sin(angle)*radius, .76 + (i % 4)*.1);
  }
  cone("western mountain", -58,11,-52,19,23,[0.31,0.29,0.25]);
  cone("northern mountain", 8,10,-61,17,21,[0.36,0.34,0.30]);
  cone("eastern mountain", 58,13,-48,22,27,[0.28,0.30,0.29]);
  cone("western summit", -58,22,-52,8,9,[0.62,0.65,0.62]);
  cone("northern summit", 8,20,-61,7,8,[0.66,0.68,0.64]);
  cone("eastern summit", 58,25,-48,9,10,[0.63,0.66,0.62]);
  sphere("cloud", -36,31,-44,7,[0.69,0.79,0.81],2);
  sphere("cloud", 2,34,-53,8,[0.72,0.81,0.82],2.2);
  sphere("cloud", 48,29,-35,7,[0.74,0.81,0.82],1.8);

  // Four-legged tower, observation room and elevated creator destination.
  const towerX = 38, towerZ = 30;
  for (const dx of [-2.2,2.2]) for (const dz of [-2.2,2.2]) {
    box("observation tower leg", towerX+dx,7,towerZ+dz,.42,14,.42,colors.white,true);
  }
  box("observation deck", towerX,14.2,towerZ,7,.5,7,colors.stone,true);
  box("observation room", towerX,16.2,towerZ,5.5,3.5,5.5,colors.glass);
  box("observation roof", towerX,18.3,towerZ,6.5,.5,6.5,colors.roof);
  box("tower beacon", towerX,19,towerZ,1,.9,1,colors.gold);

  const earthRegions = [
    {id:"home",name:"OMNIVERSE CITY",lat:0,lon:0,center:[0,0],biome:"city",ground:colors.grass},
    {id:"new-york",name:"NEW YORK · NORTH AMERICA",lat:40.7,lon:-74.0,center:[180,0],biome:"city",ground:[0.24,0.36,0.27]},
    {id:"rio",name:"AMAZON BASIN · SOUTH AMERICA",lat:-3.1,lon:-60.0,center:[360,0],biome:"rainforest",ground:[0.12,0.29,0.17]},
    {id:"london",name:"LONDON · EUROPE",lat:51.5,lon:-0.1,center:[0,180],biome:"city",ground:[0.31,0.39,0.31]},
    {id:"nairobi",name:"NAIROBI · AFRICA",lat:-1.3,lon:36.8,center:[180,180],biome:"savanna",ground:[0.47,0.37,0.22]},
    {id:"cairo",name:"CAIRO · MIDDLE EAST",lat:30.0,lon:31.2,center:[360,180],biome:"desert",ground:[0.58,0.43,0.26]},
    {id:"tokyo",name:"TOKYO · ASIA",lat:35.7,lon:139.7,center:[0,360],biome:"mountain",ground:[0.27,0.35,0.28]},
    {id:"sydney",name:"SYDNEY · OCEANIA",lat:-33.9,lon:151.2,center:[180,360],biome:"outback",ground:[0.48,0.25,0.16]},
    {id:"antarctica",name:"RESEARCH STATION · ANTARCTICA",lat:-77.8,lon:166.7,center:[360,360],biome:"ice",ground:[0.62,0.69,0.69]},
  ];
  let activeRegion = earthRegions[0];

  function createEarthRegion(region) {
    if (region.id==="home") return;
    const [cx,cz]=region.center;
    box(`${region.id} terrain`,cx,-.55,cz,150,1,150,region.ground);
    box(`${region.id} arrival plaza`,cx,.08,cz,28,.16,28,colors.stone);
    box(`${region.id} main road`,cx,.035,cz,5,.07,132,colors.road);
    box(`${region.id} cross road`,cx,.04,cz,132,.08,5,colors.road);
    for (let offset=-54; offset<=54; offset+=12) {
      box(`${region.id} road marking`,cx,.08,cz+offset,.12,.02,3.8,colors.line);
      box(`${region.id} road marking`,cx+offset,.085,cz,3.8,.02,.12,colors.line);
    }

    if (region.biome==="city") {
      makeHouse(`${region.id} residence`,cx-28,cz-24,[.62,.59,.48],[.22,.18,.14]);
      makeHouse(`${region.id} residence`,cx-44,cz-24,[.53,.61,.58],[.18,.23,.24]);
      box(`${region.id} civic building`,cx+30,4.5,cz-25,18,9,14,[.47,.47,.42],true);
      box(`${region.id} civic roof`,cx+30,9.25,cz-25,19,.5,15,colors.roof);
      for (let wx=cx+24;wx<=cx+36;wx+=6) {
        box(`${region.id} civic window`,wx,4.5,cz-32.1,3,3,.08,colors.glass);
      }
      for (const offset of [-36,36]) {
        cylinder(`${region.id} streetlight`,cx+offset,2.4,cz+offset,.07,4.8,[.2,.23,.22]);
      }
    } else if (region.biome==="rainforest") {
      box(`${region.id} river`,cx+42,-.01,cz,18,.12,145,[.08,.32,.38]);
      for (let i=0;i<34;i++) {
        const x=cx-58+(i*37%116), z=cz-58+(i*53%116);
        if (Math.abs(x-(cx+42))<13) continue;
        makeTree(x,z,.85+(i%4)*.1);
        if (i%3===0) sphere(`${region.id} understory`,x,.45,z,.7,[.13,.32,.16],.48);
      }
    } else if (region.biome==="savanna") {
      for (let i=0;i<18;i++) {
        const x=cx-54+(i*29%108), z=cz-52+(i*41%104);
        makeTree(x,z,.72+(i%5)*.11);
        if (i%3===0) sphere(`${region.id} boulder`,x+4,.55,z+3,1.1,[.42,.34,.23],.7);
      }
      box(`${region.id} waterhole`,cx+36,.02,cz+34,22,.12,15,[.10,.33,.36]);
    } else if (region.biome==="desert") {
      for (let i=0;i<14;i++) {
        const x=cx-54+(i*31%108), z=cz-52+(i*47%104);
        sphere(`${region.id} dune`,x,.15,z,7,[.63,.47,.29],2.2);
      }
      for (const offset of [-28,28]) {
        cone(`${region.id} mesa`,cx+offset,7,cz-46,12,15,[.48,.33,.22]);
      }
    } else if (region.biome==="mountain") {
      for (const offset of [-44,0,44]) {
        cone(`${region.id} mountain`,cx+offset,15,cz-48,20,30,[.35,.37,.34]);
        cone(`${region.id} snow cap`,cx+offset,29,cz-48,8,10,[.76,.79,.77]);
      }
      for (let i=0;i<12;i++) makeTree(cx-50+(i*19%100),cz+32+(i*23%32),.75+(i%3)*.1);
    } else if (region.biome==="outback") {
      for (let i=0;i<12;i++) {
        const x=cx-52+(i*37%104),z=cz-50+(i*43%100);
        cone(`${region.id} red rock`,x,3+(i%3),z,4+(i%4),7+(i%5),[.48,.22,.14]);
        if (i%2===0) cylinder(`${region.id} scrub`,x+6,.45,z+4,.65,.9,[.28,.34,.19]);
      }
    } else if (region.biome==="ice") {
      box(`${region.id} frozen lake`,cx+38,-.005,cz,46,.10,115,[.58,.73,.77]);
      for (let i=0;i<14;i++) {
        const x=cx-55+(i*31%110),z=cz-52+(i*47%104);
        cone(`${region.id} ice ridge`,x,5+(i%4)*2,z,7+(i%3)*2,11+(i%4)*3,[.72,.80,.81]);
      }
      box(`${region.id} station`,cx-28,2.2,cz-28,14,4.4,10,[.78,.31,.16],true);
      box(`${region.id} station roof`,cx-28,4.55,cz-28,14.4,.3,10.4,colors.roof);
    }
  }
  for (const region of earthRegions) createEarthRegion(region);

  const player = { x: 0, y: .66, z: 12, velocityX: 0, velocityZ: 0, verticalSpeed: 0, yaw: 0, pitch: -.12, stamina: 100, camera: "third", active: false };
  const input = new Set();
  const touchState = new Set();
  const visited = new Set();
  let jumpRequested = false;
  const knownZones = ["CENTRAL PLAZA", "RESIDENTIAL DISTRICT", "COMMERCIAL DISTRICT", "OBSERVATION RIDGE", "COAST",
    ...earthRegions.slice(1).map((region)=>region.name)];
  let lastTime = performance.now(), toastTimer = 0, dayTime = .31, dragging = false, previousPointer = null;
  let viewProjection = new Float32Array(16);
  let cameraEye = null;
  let playerPositionBuffer, playerNormalBuffer;
  const npcTemplates = [
    {name:"Maya",role:"local guide",dialogue:"Every stop is a small window into a much bigger world.",skin:[.68,.46,.34],hair:[.12,.07,.045],cloth:[.16,.33,.32],shoes:[.12,.14,.15],route:[[-7,-6],[-7,6],[6,6],[6,-6]]},
    {name:"Amina",role:"field researcher",dialogue:"Look around: the landscape changes as you cross the planet.",skin:[.43,.25,.16],hair:[.08,.045,.025],cloth:[.58,.35,.13],shoes:[.18,.16,.13],route:[[7,-7],[10,2],[4,9],[1,1]]},
    {name:"Kenji",role:"world builder",dialogue:"Choose another region in the atlas to continue your journey.",skin:[.72,.52,.39],hair:[.11,.075,.05],cloth:[.25,.3,.48],shoes:[.13,.14,.18],route:[[-10,9],[-3,12],[8,10],[3,5]]},
    {name:"Leo",role:"traveler",dialogue:"The atlas links these regional hubs; it is a beginning, not a full-scale Earth.",skin:[.58,.36,.25],hair:[.16,.11,.08],cloth:[.39,.2,.24],shoes:[.16,.14,.13],route:[[11,1],[8,-9],[1,-12],[5,-3]]},
  ];
  let npcs = [];

  function resetNpcs() {
    const [cx,cz]=activeRegion.center;
    npcs=npcTemplates.map((template,index)=>({
      ...template,
      palette:{
        skin:template.skin,lips:[.42,.16,.16],eyes:[.16,.1,.08],white:[.9,.86,.78],
        hair:template.hair,cloth:template.cloth,shoes:template.shoes,
      },
      route:template.route.map(([dx,dz])=>[cx+dx,cz+dz]),
      waypoint:(index+1)%template.route.length,
      x:cx+template.route[0][0],y:.66,z:cz+template.route[0][1],
      yaw:0,phase:index*1.7,gait:0,walking:false,blinkTimer:2+index*.8,blinking:false,
    }));
  }
  resetNpcs();

  function updateNpcs(delta) {
    for (const npc of npcs) {
      const [targetX,targetZ]=npc.route[npc.waypoint];
      const dx=targetX-npc.x,dz=targetZ-npc.z,distance=Math.hypot(dx,dz);
      npc.walking=distance>.35;
      if (npc.walking) {
        const step=Math.min(distance,delta*.9);
        npc.x+=dx/distance*step;
        npc.z+=dz/distance*step;
        npc.yaw=Math.atan2(-dx,-dz);
        npc.phase+=delta*5;
        npc.gait=Math.min(1,npc.gait+delta*3);
        if (distance<.7) npc.waypoint=(npc.waypoint+1)%npc.route.length;
      } else {
        npc.gait=Math.max(0,npc.gait-delta*3);
        if (distance<.35) npc.waypoint=(npc.waypoint+1)%npc.route.length;
      }
      npc.blinkTimer-=delta;
      npc.blinking=npc.blinkTimer<=0 && npc.blinkTimer>-.14;
      if (npc.blinkTimer<-.14) npc.blinkTimer=2.8+((npc.name.length*17)%19)/10;
    }
  }

  function nearestNpc() {
    let nearest=null,nearestDistance=2.8;
    for (const npc of npcs) {
      const distance=Math.hypot(npc.x-player.x,npc.z-player.z);
      if (distance<nearestDistance) { nearest=npc;nearestDistance=distance; }
    }
    return nearest;
  }

  function interactWithNpc() {
    const npc=nearestNpc();
    if (npc) showToast(`${npc.name.toUpperCase()} · ${npc.dialogue}`);
    else showToast("MOVE CLOSER TO A LOCAL TO TALK");
  }

  function normalize(v) {
    const length = Math.hypot(v[0],v[1],v[2]) || 1;
    return [v[0]/length,v[1]/length,v[2]/length];
  }
  function cross(a,b) { return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]; }
  function dot(a,b) { return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }
  function perspective(fov, aspect, near, far) {
    const f = 1 / Math.tan(fov / 2), nf = 1 / (near - far);
    return new Float32Array([f/aspect,0,0,0, 0,f,0,0, 0,0,(far+near)*nf,-1, 0,0,2*far*near*nf,0]);
  }
  function lookAt(eye, center, up) {
    const z = normalize([eye[0]-center[0],eye[1]-center[1],eye[2]-center[2]]);
    const x = normalize(cross(up,z)), y = cross(z,x);
    return new Float32Array([x[0],y[0],z[0],0, x[1],y[1],z[1],0, x[2],y[2],z[2],0,
      -dot(x,eye),-dot(y,eye),-dot(z,eye),1]);
  }
  function multiply(a,b) {
    const out = new Float32Array(16);
    for (let column=0; column<4; column++) for (let row=0; row<4; row++) {
      out[column*4+row] = a[row]*b[column*4] + a[4+row]*b[column*4+1] + a[8+row]*b[column*4+2] + a[12+row]*b[column*4+3];
    }
    return out;
  }
  function modelMatrix(position, scale, rotation) {
    const angles = Array.isArray(rotation) ? rotation : [0, rotation, 0];
    const [sx,sy,sz] = angles.map(Math.sin), [cx,cy,cz] = angles.map(Math.cos);
    const r00=cy*cz, r01=cz*sy*sx-sz*cx, r02=cz*sy*cx+sz*sx;
    const r10=cy*sz, r11=sz*sy*sx+cz*cx, r12=sz*sy*cx-cz*sx;
    const r20=-sy, r21=cy*sx, r22=cy*cx;
    return new Float32Array([
      r00*scale[0],r10*scale[0],r20*scale[0],0,
      r01*scale[1],r11*scale[1],r21*scale[1],0,
      r02*scale[2],r12*scale[2],r22*scale[2],0,
      position[0],position[1],position[2],1,
    ]);
  }

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.6);
    const width = Math.max(1, Math.floor(canvas.clientWidth*ratio));
    const height = Math.max(1, Math.floor(canvas.clientHeight*ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width; canvas.height = height;
      gl.viewport(0,0,width,height);
    }
  }

  function drawMesh(mesh, position, scale, rotation, color) {
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.positionBuffer);
    gl.enableVertexAttribArray(attributes.position);
    gl.vertexAttribPointer(attributes.position,3,gl.FLOAT,false,0,0);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normalBuffer);
    gl.enableVertexAttribArray(attributes.normal);
    gl.vertexAttribPointer(attributes.normal,3,gl.FLOAT,false,0,0);
    const model = modelMatrix(position,scale,rotation);
    gl.uniformMatrix4fv(uniforms.model,false,model);
    gl.uniformMatrix3fv(uniforms.normalMatrix,false,new Float32Array([
      model[0]/(scale[0]*scale[0]),model[1]/(scale[0]*scale[0]),model[2]/(scale[0]*scale[0]),
      model[4]/(scale[1]*scale[1]),model[5]/(scale[1]*scale[1]),model[6]/(scale[1]*scale[1]),
      model[8]/(scale[2]*scale[2]),model[9]/(scale[2]*scale[2]),model[10]/(scale[2]*scale[2]),
    ]));
    gl.uniform3fv(uniforms.color,color);
    gl.drawArrays(gl.TRIANGLES,0,mesh.count);
  }

  let gaitPhase = 0;
  let gaitAmount = 0;
  let avatarClock = 0;
  let blinkStarted = -1;
  let nextBlink = 2.2;
  let expressionIndex = 0;
  const expressionNames = ["NEUTRAL", "HAPPY", "CONCERNED"];

  function rotateHumanPoint(point, pivot, angle) {
    const y=point[1]-pivot[1], z=point[2]-pivot[2];
    const cosine=Math.cos(angle), sine=Math.sin(angle);
    return [point[0],pivot[1]+y*cosine-z*sine,pivot[2]+y*sine+z*cosine];
  }

  function poseHumanPoint(point, group, side, poses) {
    let result=[...point];
    for (const pose of poses[`${group}_${side}`] || []) {
      result=rotateHumanPoint(result,pose.pivot,pose.angle);
    }
    return result;
  }

  function humanWorldPosition(point, actor) {
    const cosine=Math.cos(actor.yaw), sine=Math.sin(actor.yaw);
    return [
      actor.x+point[0]*cosine+point[1]*sine,
      actor.y+point[2]-.52,
      actor.z-point[0]*sine+point[1]*cosine,
    ];
  }

  function createHumanPoses(phaseAmount, movementAmount, idleSway, running=false) {
    const poses={};
    for (const side of [-1,1]) {
      const phase=phaseAmount+(side<0?0:Math.PI);
      const shoulder=[side*.23,0,1.35];
      const elbow=[side*.29,0,1.13];
      const wrist=[side*.32,0,.90];
      const hip=[side*.105,0,.93];
      const knee=[side*.11,0,.51];
      const ankle=[side*.105,0,.105];
      const armAngle=Math.sin(phase+Math.PI)*movementAmount*(running ? .34 : .27);
      const elbowAngle=Math.max(0,Math.cos(phase+Math.PI))*movementAmount*(running ? .24 : .12);
      const legAngle=Math.sin(phase)*movementAmount*(running ? .40 : .29);
      const kneeAngle=Math.max(0,Math.cos(phase))*movementAmount*(running ? .48 : .24);
      const footAngle=-Math.max(0,Math.cos(phase))*movementAmount*.10;
      poses[`upper_arm_${side}`]=[{pivot:shoulder,angle:armAngle}];
      poses[`forearm_${side}`]=[{pivot:elbow,angle:elbowAngle},{pivot:shoulder,angle:armAngle}];
      poses[`hand_${side}`]=[{pivot:wrist,angle:Math.sin(phase)*movementAmount*.05},{pivot:elbow,angle:elbowAngle},{pivot:shoulder,angle:armAngle}];
      poses[`thigh_${side}`]=[{pivot:hip,angle:legAngle}];
      poses[`shin_${side}`]=[{pivot:knee,angle:kneeAngle},{pivot:hip,angle:legAngle}];
      poses[`foot_${side}`]=[{pivot:ankle,angle:footAngle},{pivot:knee,angle:kneeAngle},{pivot:hip,angle:legAngle}];
    }
    poses.chest_0=[{pivot:[0,0,.93],angle:idleSway}];
    poses.spine_0=[{pivot:[0,0,.93],angle:idleSway}];
    return poses;
  }

  function drawHuman(actor, poses, blink, expression) {
    for (const part of avatarParts) {
      const poseGroup=part.group==="chest"||part.group==="spine"?"0":part.side;
      const position=poseHumanPoint(part.position||part.start,part.group,poseGroup,poses);
      const color=actor.palette?.[part.materialKey]||part.color;
      if (part.kind==="sphere") {
        const scale=[part.scale[0],part.scale[2],part.scale[1]];
        if (part.feature==="eye") scale[1]*=Math.max(.04,1-blink);
        if (part.feature==="mouth") {
          if (expression===1) {
            position[2]+=.004;
            scale[1]*=1.25;
          } else if (expression===2) {
            position[2]-=.003;
            scale[1]*=.82;
          }
        }
        if (part.feature==="brow"&&expression===1) position[2]+=.008;
        drawMesh(meshes.sphere,humanWorldPosition(position,actor),scale,[0,actor.yaw,0],color);
        continue;
      }

      const start=humanWorldPosition(poseHumanPoint(part.start,part.group,part.side,poses),actor);
      const end=humanWorldPosition(poseHumanPoint(part.end,part.group,part.side,poses),actor);
      const direction=[end[0]-start[0],end[1]-start[1],end[2]-start[2]];
      const length=Math.hypot(...direction)||.001;
      const horizontal=Math.hypot(direction[0],direction[1]);
      const rotationX=Math.atan2(direction[2],horizontal);
      const rotationZ=Math.atan2(-direction[0],direction[1]);
      const center=[(start[0]+end[0])*.5,(start[1]+end[1])*.5,(start[2]+end[2])*.5];
      drawMesh(part.mesh,center,[part.startRadius*2,length,part.startRadius*2],
        [rotationX,0,rotationZ],color);
    }
  }

  function renderAvatar(delta) {
    if (player.camera === "first") return;
    avatarClock+=delta;
    if (avatarClock>=nextBlink) {
      blinkStarted=avatarClock;
      nextBlink=avatarClock+3.2+((Math.sin(avatarClock*1.7)+1)*1.1);
    }
    const blink=blinkStarted<0?0:Math.max(0,1-Math.abs(avatarClock-blinkStarted-.09)/.09);
    const moving=input.has("KeyW")||input.has("KeyA")||input.has("KeyS")||input.has("KeyD")
      ||input.has("ArrowUp")||input.has("ArrowDown")||input.has("ArrowLeft")||input.has("ArrowRight")
      ||[...touchState].some((key)=>["forward","back","left","right"].includes(key));
    const running=input.has("ShiftLeft")||input.has("ShiftRight")||touchState.has("run");
    gaitAmount+=((moving?1:0)-gaitAmount)*Math.min(delta*9,1);
    gaitPhase+=delta*(running?11:7);
    const idleSway=Math.sin(avatarClock*.72)*.012*(1-gaitAmount);
    drawHuman(player,createHumanPoses(gaitPhase,gaitAmount,idleSway,running),blink,expressionIndex);
  }

  function renderNpcs(delta) {
    updateNpcs(delta);
    for (const npc of npcs) {
      const sway=Math.sin(npc.phase*.2)*.012*(1-npc.gait);
      drawHuman(npc,createHumanPoses(npc.phase,npc.gait,sway),npc.blinking?1:0,0);
    }
  }

  function render(now) {
    resize();
    const delta = Math.min((now-lastTime)/1000,.05);
    lastTime = now;
    if (player.active&&!atlas.classList.contains("open")) updatePlayer(delta);
    dayTime = (dayTime + delta*.006) % 1;
    const daylight = Math.max(0,Math.sin(dayTime*Math.PI*2-Math.PI*.5));
    const fogColor = [0.31 + daylight*.20,0.43 + daylight*.22,0.49 + daylight*.20];
    gl.clearColor(...fogColor,1);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    const forward = [Math.sin(player.yaw)*Math.cos(player.pitch),Math.sin(player.pitch),-Math.cos(player.yaw)*Math.cos(player.pitch)];
    let eye, target;
    if (player.camera === "first") {
      eye = [player.x,player.y+1.15,player.z];
      target = [eye[0]+forward[0]*8,eye[1]+forward[1]*8,eye[2]+forward[2]*8];
    } else {
      eye = [player.x-forward[0]*5.6,player.y+2.5-forward[1]*2,player.z-forward[2]*5.6];
      target = [player.x,player.y+.9,player.z];
      eye = clipCamera(target,eye);
      if (cameraEye) {
        const blend=1-Math.exp(-delta*12);
        const smoothed=cameraEye.map((value,index)=>value+(eye[index]-value)*blend);
        cameraEye=cameraBlocked(smoothed)?eye:smoothed;
        eye=cameraEye;
      } else {
        cameraEye=eye;
      }
    }
    const view = lookAt(eye,target,[0,1,0]);
    viewProjection = multiply(perspective(Math.PI/3,canvas.width/canvas.height,.1,260),view);
    gl.useProgram(program);
    gl.uniformMatrix4fv(uniforms.viewProjection,false,viewProjection);
    gl.uniform3fv(uniforms.cameraPosition,eye);
    gl.uniform3fv(uniforms.fogColor,fogColor);
    gl.uniform3fv(uniforms.lightDirection,normalize([
      Math.cos(dayTime*Math.PI*2)*.72,
      .22+daylight*.86,
      Math.sin(dayTime*Math.PI*2)*.72,
    ]));
    gl.uniform1f(uniforms.sun,.44+daylight*.7);
    for (const object of objects) {
      const dx=object.position[0]-player.x,dy=object.position[1]-player.y,dz=object.position[2]-player.z;
      if (dx*dx+dy*dy+dz*dz>150*150) continue;
      drawMesh(meshes[object.type],object.position,object.scale,object.rotation,object.color);
    }
    renderAvatar(delta);
    if (player.active) renderNpcs(delta);
    updateHud();
    drawMap();
    requestAnimationFrame(render);
  }

  function zoneAt(x,z) {
    if (activeRegion.id!=="home") return activeRegion.name;
    if (z > 42) return "COAST";
    if (x > 29 && z > 18) return "OBSERVATION RIDGE";
    if (Math.hypot(x,z) < 14) return "CENTRAL PLAZA";
    if (x < -15 && z < -10) return "RESIDENTIAL DISTRICT";
    if (x > 15 && z < -10) return "COMMERCIAL DISTRICT";
    return "WILDERNESS";
  }

  function updateHud() {
    const zone = zoneAt(player.x,player.z);
    $("#location").textContent = zone;
    const latitude=activeRegion.lat-player.z*.0007;
    const longitude=activeRegion.lon+player.x*.0007;
    $("#coordinates").textContent = `${latitude.toFixed(2)}° / ${longitude.toFixed(2)}°  ·  ${player.camera.toUpperCase()} VIEW`;
    $("#stamina").style.width = `${player.stamina}%`;
    $("#stamina-value").textContent = `${Math.round(player.stamina)}%`;
    $("#discovery-count").textContent = `${Math.min(visited.size,knownZones.length)} / ${knownZones.length}`;
    $("#discovery-progress").style.width = `${Math.min(visited.size,knownZones.length)/knownZones.length*100}%`;
    const nearbyNpc=nearestNpc();
    const prompt=$("#npc-prompt");
    prompt.hidden=!player.active||!nearbyNpc;
    if (nearbyNpc) prompt.textContent=`F  ·  TALK TO ${nearbyNpc.name.toUpperCase()} · ${nearbyNpc.role.toUpperCase()}`;
    if (knownZones.includes(zone) && !visited.has(zone) && player.active) {
      visited.add(zone);
      if (visited.size > 1) showToast(`${zone} DISCOVERED`);
    }
    $("#camera-button").textContent = `SWITCH CAMERA · ${player.camera === "third" ? "THIRD PERSON" : "FIRST PERSON"}`;
  }

  function drawMap() {
    const w=mapCanvas.width,h=mapCanvas.height, cx=w/2,cy=h/2,scale=.82;
    mapContext.clearRect(0,0,w,h);
    const color=activeRegion.ground.map((channel)=>Math.round(channel*255)).join(",");
    mapContext.fillStyle="#101e20"; mapContext.fillRect(0,0,w,h);
    mapContext.fillStyle=activeRegion.id==="home"?"#233d38":`rgb(${color})`;
    mapContext.fillRect(5,5,w-10,h-10);
    if (activeRegion.id==="home") {
      mapContext.fillStyle="#16506a"; mapContext.fillRect(15,111,w-30,39);
      mapContext.fillStyle="#c6a674"; mapContext.fillRect(4,104,w-8,9);
      mapContext.fillStyle="#6a7667"; mapContext.fillRect(61,62,38,38);
      mapContext.fillStyle="#a46d48"; mapContext.fillRect(29,35,18,15); mapContext.fillRect(29,53,18,15);
      mapContext.fillStyle="#467380"; mapContext.fillRect(108,34,18,28); mapContext.fillRect(104,75,20,14);
      mapContext.fillStyle="#9f8c6b"; mapContext.fillRect(128,28,18,18);
    } else {
      mapContext.fillStyle="#59655e";
      mapContext.fillRect(cx-3,5,6,h-10);
      mapContext.fillRect(5,cy-3,w-10,6);
      mapContext.fillStyle="#a9a28d"; mapContext.fillRect(cx-15,cy-15,30,30);
      for (const npc of npcs) {
        const npcX=Math.max(9,Math.min(151,cx+(npc.x-activeRegion.center[0])*scale));
        const npcY=Math.max(9,Math.min(151,cy+(npc.z-activeRegion.center[1])*scale));
        mapContext.fillStyle="#f0bd76";
        mapContext.beginPath(); mapContext.arc(npcX,npcY,2,0,Math.PI*2); mapContext.fill();
      }
    }
    const localX=activeRegion.id==="home"?player.x:player.x-activeRegion.center[0];
    const localZ=activeRegion.id==="home"?player.z:player.z-activeRegion.center[1];
    const mx=Math.max(9,Math.min(151,cx+localX*scale)), my=Math.max(9,Math.min(151,cy+localZ*scale));
    mapContext.fillStyle="rgba(116,224,201,.24)"; mapContext.beginPath(); mapContext.arc(mx,my,8,0,Math.PI*2); mapContext.fill();
    mapContext.fillStyle="#87e4cf"; mapContext.beginPath(); mapContext.arc(mx,my,3.5,0,Math.PI*2); mapContext.fill();
  }

  function collides(x,z,y=player.y) {
    for (const item of blockers) {
      if (y > item.y+item.hy+.15 || y+1.55 < item.y-item.hy) continue;
      const px=Math.max(item.x-item.hx,Math.min(x,item.x+item.hx));
      const pz=Math.max(item.z-item.hz,Math.min(z,item.z+item.hz));
      if ((x-px)**2+(z-pz)**2 < .7**2) return true;
    }
    return false;
  }

  function cameraBlocked(point) {
    return blockers.some((item) =>
      point[0] > item.x-item.hx-.12 && point[0] < item.x+item.hx+.12
      && point[1] > item.y-item.hy-.12 && point[1] < item.y+item.hy+.12
      && point[2] > item.z-item.hz-.12 && point[2] < item.z+item.hz+.12
    );
  }

  function clipCamera(target, desired) {
    for (let step=1; step<=18; step++) {
      const t=step/18;
      const point=[
        target[0]+(desired[0]-target[0])*t,
        target[1]+(desired[1]-target[1])*t,
        target[2]+(desired[2]-target[2])*t,
      ];
      if (cameraBlocked(point)) {
        const safeT=Math.max(.08,(step-1)/18-.025);
        return [
          target[0]+(desired[0]-target[0])*safeT,
          target[1]+(desired[1]-target[1])*safeT,
          target[2]+(desired[2]-target[2])*safeT,
        ];
      }
    }
    return desired;
  }

  function updatePlayer(delta) {
    let forward=Number(input.has("KeyW")||input.has("ArrowUp")||touchState.has("forward"))-Number(input.has("KeyS")||input.has("ArrowDown")||touchState.has("back"));
    let sideways=Number(input.has("KeyD")||input.has("ArrowRight")||touchState.has("right"))-Number(input.has("KeyA")||input.has("ArrowLeft")||touchState.has("left"));
    const length=Math.hypot(forward,sideways);
    if (length>0) { forward/=length; sideways/=length; }
    const moving=length>0;
    const running=(input.has("ShiftLeft")||input.has("ShiftRight")||touchState.has("run"))&&moving&&player.stamina>1;
    player.stamina=running?Math.max(0,player.stamina-24*delta):Math.min(100,player.stamina+16*delta);
    const speed=running?10.5:6;
    const targetX=(Math.sin(player.yaw)*forward+Math.cos(player.yaw)*sideways)*speed;
    const targetZ=(-Math.cos(player.yaw)*forward+Math.sin(player.yaw)*sideways)*speed;
    const response=length>0?22:28;
    player.velocityX += (targetX-player.velocityX)*Math.min(1,response*delta);
    player.velocityZ += (targetZ-player.velocityZ)*Math.min(1,response*delta);
    const [regionX,regionZ]=activeRegion.center;
    const bounds=activeRegion.id==="home"
      ?{minX:-74,maxX:74,minZ:-48,maxZ:52}
      :{minX:regionX-68,maxX:regionX+68,minZ:regionZ-68,maxZ:regionZ+68};
    const nextX=Math.max(bounds.minX,Math.min(bounds.maxX,player.x+player.velocityX*delta));
    const nextZ=Math.max(bounds.minZ,Math.min(bounds.maxZ,player.z+player.velocityZ*delta));
    if (!collides(nextX,player.z)) player.x=nextX;
    else player.velocityX=0;
    if (!collides(player.x,nextZ)) player.z=nextZ;
    else player.velocityZ=0;
    const towerDeck = activeRegion.id==="home"&&Math.abs(player.x-38)<3.15&&Math.abs(player.z-30)<3.15;
    const floor = towerDeck ? 15.11 : .66;
    if (jumpRequested && player.y <= floor+.02) player.verticalSpeed=7.5;
    jumpRequested=false;
    player.verticalSpeed-=20*delta;
    player.y=Math.max(floor,player.y+player.verticalSpeed*delta);
    if (player.y===floor) player.verticalSpeed=0;
  }

  function showToast(message) {
    toast.textContent=message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>toast.classList.remove("show"),2200);
  }

  function enterWorld() {
    player.active=true;
    landing.classList.add("hidden");
    $("#hud").hidden=false;
    $("#crosshair").style.display="block";
    if (matchMedia("(pointer: fine)").matches) canvas.requestPointerLock?.();
    showToast("WELCOME TO OMNIVERSE");
  }
  $("#enter-button").addEventListener("click",enterWorld);
  $("#menu-button").addEventListener("click",()=>panel.classList.toggle("open"));
  $("#close-panel").addEventListener("click",()=>panel.classList.remove("open"));
  const atlas=$("#earth-atlas");
  function setAtlasOpen(open) {
    atlas.classList.toggle("open",open);
    atlas.setAttribute("aria-hidden",String(!open));
    input.clear();
    if (open) panel.classList.remove("open");
  }
  $("#earth-atlas-button").addEventListener("click",()=>setAtlasOpen(true));
  $("#close-atlas").addEventListener("click",()=>setAtlasOpen(false));
  document.querySelectorAll("[data-region]").forEach((button)=>{
    button.addEventListener("click",()=>{
      const region=earthRegions.find((entry)=>entry.id===button.dataset.region);
      if (!region) throw new Error(`Unknown Earth region: ${button.dataset.region}`);
      activeRegion=region;
      resetNpcs();
      [player.x,player.z]=region.center;
      player.y=.66;
      player.velocityX=0; player.velocityZ=0; player.verticalSpeed=0; player.yaw=0;
      cameraEye=null;
      setAtlasOpen(false);
      showToast(`ARRIVED · ${region.name}`);
    });
  });
  $("#camera-button").addEventListener("click",()=>{ player.camera=player.camera==="third"?"first":"third"; });
  $("#save-button").addEventListener("click",()=>{
    try {
      localStorage.setItem("omniverse-browser-save",JSON.stringify({x:player.x,y:player.y,z:player.z,yaw:player.yaw,pitch:player.pitch,camera:player.camera,regionId:activeRegion.id,visited:[...visited]}));
      showToast("EXPLORER STATE SAVED IN THIS BROWSER");
    } catch (error) { showToast(`SAVE FAILED: ${error.message}`); }
  });
  $("#load-button").addEventListener("click",loadSave);
  function loadSave() {
    try {
      const raw=localStorage.getItem("omniverse-browser-save");
      if (!raw) { showToast("NO BROWSER SAVE FOUND"); return; }
      const saved=JSON.parse(raw);
      if (![saved.x,saved.z,saved.yaw,saved.pitch].every(Number.isFinite)) throw new Error("Save data is invalid");
      activeRegion=earthRegions.find((region)=>region.id===saved.regionId)||earthRegions[0];
      resetNpcs();
      const [regionX,regionZ]=activeRegion.center;
      const bounds=activeRegion.id==="home"
        ?{minX:-74,maxX:74,minZ:-48,maxZ:52}
        :{minX:regionX-68,maxX:regionX+68,minZ:regionZ-68,maxZ:regionZ+68};
      player.x=Math.max(bounds.minX,Math.min(bounds.maxX,saved.x));
      player.z=Math.max(bounds.minZ,Math.min(bounds.maxZ,saved.z));
      player.y=Math.max(.66,Math.min(15.11,Number.isFinite(saved.y)?saved.y:.66));
      player.velocityX=0; player.velocityZ=0;
      player.yaw=saved.yaw; player.pitch=saved.pitch; player.camera=saved.camera==="first"?"first":"third";
      cameraEye=null;
      visited.clear();
      if (Array.isArray(saved.visited)) for (const zone of saved.visited) if (knownZones.includes(zone)) visited.add(zone);
      showToast("EXPLORER STATE LOADED");
    } catch (error) { showToast(`LOAD FAILED: ${error.message}`); }
  }
  document.querySelectorAll("[data-teleport]").forEach((button)=>{
    button.addEventListener("click",()=>{
      const destinations={
          plaza:[0,12], homes:[-31,-26], market:[33,-18],
          tower:[38,30], coast:[-38,43],
      };
      const [x,z]=destinations[button.dataset.teleport];
      activeRegion=earthRegions[0];
      resetNpcs();
      player.x=x; player.z=z; player.y=button.dataset.teleport==="tower"?15.11:.66;
      player.velocityX=0; player.velocityZ=0; player.verticalSpeed=0; player.yaw=0; cameraEye=null;
      panel.classList.remove("open");
      setAtlasOpen(false);
      showToast(`TRAVELLED TO ${zoneAt(x,z)}`);
    });
  });

  window.addEventListener("keydown",(event)=>{
    if (event.code==="Escape"&&atlas.classList.contains("open")) {
      setAtlasOpen(false);
      event.preventDefault();
    }
    if (event.code==="Space" && !event.repeat) jumpRequested=true;
    input.add(event.code);
    if (["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(event.code)) event.preventDefault();
    if (!event.repeat && player.active && event.code==="F1") panel.classList.toggle("open");
    if (!event.repeat && player.active && event.code==="F5") $("#save-button").click();
    if (!event.repeat && player.active && event.code==="F6") loadSave();
    if (!event.repeat && player.active && event.code==="KeyV") $("#camera-button").click();
    if (!event.repeat && player.active && !atlas.classList.contains("open") && event.code==="KeyF") interactWithNpc();
    if (!event.repeat && player.active && event.code==="KeyE") {
      expressionIndex=(expressionIndex+1)%expressionNames.length;
      showToast(`FACIAL EXPRESSION · ${expressionNames[expressionIndex]}`);
    }
    if (!event.repeat && player.active && event.code==="Escape" && document.pointerLockElement) document.exitPointerLock();
  });
  window.addEventListener("keyup",(event)=>input.delete(event.code));
  window.addEventListener("blur",()=>input.clear());
  canvas.addEventListener("click",()=>{ if (player.active && matchMedia("(pointer: fine)").matches && !document.pointerLockElement) canvas.requestPointerLock?.(); });
  document.addEventListener("pointerlockchange",()=>{
    $("#bottom-hint").textContent=document.pointerLockElement
      ?"ESC TO RELEASE  ·  F TALK  ·  E EXPRESSION"
      :"CLICK WORLD TO CAPTURE MOUSE  ·  F TALK  ·  E EXPRESSION";
  });
  document.addEventListener("mousemove",(event)=>{
    if (!player.active || !document.pointerLockElement) return;
    player.yaw-=event.movementX*.0026;
    player.pitch=Math.max(-.72,Math.min(.5,player.pitch-event.movementY*.002));
  });
  canvas.addEventListener("pointerdown",(event)=>{
    if (event.pointerType==="touch" && player.active) {
      dragging=true; previousPointer=[event.clientX,event.clientY]; canvas.setPointerCapture(event.pointerId);
    }
  });
  canvas.addEventListener("pointermove",(event)=>{
    if (!dragging || !previousPointer) return;
    player.yaw-=(event.clientX-previousPointer[0])*.006;
    player.pitch=Math.max(-.72,Math.min(.5,player.pitch-(event.clientY-previousPointer[1])*.004));
    previousPointer=[event.clientX,event.clientY];
  });
  canvas.addEventListener("pointerup",()=>{dragging=false;previousPointer=null;});
  document.querySelectorAll("[data-control]").forEach((button)=>{
    const control=button.dataset.control;
    const press=(event)=>{
      event.preventDefault();
      if(control==="camera"){player.camera=player.camera==="third"?"first":"third";return;}
      if(control==="jump"){jumpRequested=true;return;}
      if(control==="interact"){interactWithNpc();return;}
      touchState.add(control);
      button.classList.add("pressed");
    };
    const release=(event)=>{
      event.preventDefault();
      touchState.delete(control);
      button.classList.remove("pressed");
    };
    button.addEventListener("pointerdown",press);
    button.addEventListener("pointerup",release);
    button.addEventListener("pointercancel",release);
    button.addEventListener("pointerleave",release);
  });

  try {
    const saved=JSON.parse(localStorage.getItem("omniverse-browser-save")||"null");
    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.z)) {
      const resume=document.createElement("button");
      resume.type="button"; resume.className="enter-button";
      resume.innerHTML="<span>RESUME EXPLORATION</span><b>→</b>";
      resume.addEventListener("click",()=>{loadSave();enterWorld();});
      $("#enter-button").replaceWith(resume);
    }
  } catch (_) {
    // A corrupt browser save should not prevent entering a new session.
  }

  $("#hud").hidden=false;
  render(performance.now());
})();
