// The entry file of your WebAssembly module.

export function add(a: i32, b: i32): i32 {
  return a + b;
}

export function distance(
  xFrom: f64,
  yFrom: f64,
  zFrom: f64,
  xTo: f64,
  yTo: f64,
  zTo: f64
): f64 {
  var x = xFrom - xTo;
  var y = yFrom - yTo;
  var z = zFrom - zTo;
  return Math.sqrt(x * x + y * y + z * z);
}

export function distanceSq(
  xFrom: f64,
  yFrom: f64,
  zFrom: f64,
  xTo: f64,
  yTo: f64,
  zTo: f64
): f64 {
  var x = xFrom - xTo;
  var y = yFrom - yTo;
  var z = zFrom - zTo;
  return x * x + y * y + z * z;
}
