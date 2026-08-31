// @ts-check
// Maps a figure id (used in prose as <figure data-figure="id">) to a lazy import
// of its module. Each figure is its own code-split chunk. Adding a figure = one
// line here. Vite resolves these paths at build time, so only list files that exist.

export const registry = {
  // Ch1
  'starlink-live': () => import('../figures/starlinkLive.js'),
  'echo-timing': () => import('../figures/echoTiming.js'),
  'starlink-growth': () => import('../figures/starlinkGrowth.js'),
  'starlink-model': () => import('../figures/starlinkModel.js'),
  'sar-geometry': () => import('../figures/sarGeometry.js'),
  'material-explorer': () => import('../figures/materialExplorer.js'),
  'pulse-compression': () => import('../figures/pulseCompression.js'),
  'snr-explorer': () => import('../figures/snrExplorer.js'),
  // Ch2 — image formation
  'one-pixel': () => import('../figures/onePixel.js'),
  'aperture-synthesis': () => import('../figures/apertureSynthesis.js'),
  'range-doppler': () => import('../figures/rangeDoppler.js'),
  'motion-artifacts': () => import('../figures/motionArtifacts.js'),
  'back-projection': () => import('../figures/backProjection.js'),
  'shader-backprojection': () => import('../figures/shaderBackprojection.js'),
  // §4 validation
  'band-chart': () => import('../figures/bandChart.js'),
  'validation-planner': () => import('../figures/validationPlanner.js'),
  // Ch4 — how Starlink talks
  'iq-constellation': () => import('../figures/iqConstellation.js'),
  'symbol-rate': () => import('../figures/symbolRate.js'),
  'matched-filter': () => import('../figures/matchedFilter.js'),
  'ber-curves': () => import('../figures/berCurves.js'),
  'multiple-access': () => import('../figures/multipleAccess.js'),
  'beamforming-waves': () => import('../figures/beamforming.js'),
  'phased-array': () => import('../figures/phasedArray.js'),
  'beam-lobe-3d': () => import('../figures/beamLobe3D.js'),
  'beam-squint': () => import('../figures/beamSquint.js'),
  'hybrid-tiling': () => import('../figures/hybridTiling.js'),
  'polarization': () => import('../figures/polarization.js'),
  'rf-chain': () => import('../figures/rfChain.js'),
  'transistor': () => import('../figures/transistor.js'),
  'amp-classes': () => import('../figures/ampClasses.js'),
  'waveforms': () => import('../figures/waveforms.js'),
  // §7 duplexing
  'isolation-ladder': () => import('../figures/isolationLadder.js'),
  'duplex-timeline': () => import('../figures/duplexTimeline.js'),
  // §8 sweep
  'antenna-sweep': () => import('../figures/antennaSweep.js'),
  // §9 DTC
  'dtc-antenna': () => import('../figures/dtcAntenna.js'),
  'dtc-explorer': () => import('../figures/dtcExplorer.js'),
  'video-sar': () => import('../figures/videoSar.js'),
  // Ch3 — tracking motion
  'doppler-dilemma': () => import('../figures/dopplerDilemma.js'),
  'ati': () => import('../figures/ati.js'),
  'crt': () => import('../figures/crt.js'),
  'stap-cube': () => import('../figures/stapCube.js'),
  'distributed-sar': () => import('../figures/distributedSar.js'),
  'jamming': () => import('../figures/jamming.js'),
  'altitude-slicing': () => import('../figures/altitudeSlicing.js'),
  'clutter-dpca': () => import('../figures/clutterDpca.js'),
  'sigint': () => import('../figures/sigint.js'),
  // §11 implications
  'data-scale': () => import('../figures/dataScale.js'),
  'radar-timeline': () => import('../figures/radarTimeline.js'),
  // New concepts
  'coverage-revisit': () => import('../figures/coverageRevisit.js'),
  'insar-fringes': () => import('../figures/insarFringes.js'),
  'change-detection': () => import('../figures/changeDetection.js'),
  'ambiguity-function': () => import('../figures/ambiguityFunction.js'),
  'polarimetry': () => import('../figures/polarimetry.js'),
};
