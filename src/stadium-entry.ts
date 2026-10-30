/**
 * The crowd and the stadium on their own, for a game that only draws crowds (Twitch chat, parties, the
 * day's players): about a third of the whole library. Served as /lilguys-stadium.mjs and, for a classic
 * script, /lilguys-stadium.js (window.LilGuyStadium).
 */
export { createStadium, stadiumSeats, venueFor, VENUES, type Stadium, type StadiumOptions, type StadiumSeat, type VenueId } from './stadium';
export { createCrowd, crowdSeats, crowdPicture, type Crowd, type CrowdOptions, type CrowdGuy, type CrowdSeat } from './crowd-stage';
export { crowdSprite, crowdSheet, crowdShine, CROWD_SIZES, type CrowdSize, type CrowdSprite, type CrowdShine } from './crowd';
export { ART_VERSION } from './guy-code';
