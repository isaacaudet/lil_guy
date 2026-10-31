/**
 * The 3D stadium on its own, for a game that has three.js (a peer dependency, never bundled): served as
 * /lilguys-stadium3d.mjs, which imports `three` by name, so the page maps it (an import map or a bundler).
 */
export { createStadium3D, type Stadium3D, type Stadium3DOptions, type Stadium3DInfo, type Rect, type Reaction, type SignTone } from './stadium3d';
export { layout3d, stepFor, venueFor, VENUES, SPECS, nearSeats, tileFor, type Layout3D, type Seat3D, type Spec3D, type VenueId } from './stadium3d-layout';
export { ART_VERSION } from './guy-code';
