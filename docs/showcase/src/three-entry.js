// The slice of three.js the showcase pages draw their 3D with, bundled into
// the page by scripts/build-showcase.ts so nothing comes from a CDN.
import {
  WebGLRenderer, Scene, PerspectiveCamera, DirectionalLight, HemisphereLight, MeshPhysicalMaterial, MeshBasicMaterial,
  BufferGeometry, BufferAttribute, Group, Mesh, Color, Vector3, PMREMGenerator, NeutralToneMapping, CircleGeometry, CanvasTexture,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

window.LGThree = {
  T: { WebGLRenderer, Scene, PerspectiveCamera, DirectionalLight, HemisphereLight, MeshPhysicalMaterial, MeshBasicMaterial, BufferGeometry, BufferAttribute, Group, Mesh, Color, Vector3, PMREMGenerator, NeutralToneMapping, CircleGeometry, CanvasTexture },
  RoomEnvironment,
};
dispatchEvent(new Event('lg-three'));
