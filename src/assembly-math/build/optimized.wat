(module
 (type $f64_f64_f64_f64_f64_f64_=>_f64 (func (param f64 f64 f64 f64 f64 f64) (result f64)))
 (type $i32_i32_=>_i32 (func (param i32 i32) (result i32)))
 (memory $0 0)
 (export "memory" (memory $0))
 (export "add" (func $assembly/index/add))
 (export "distance" (func $assembly/index/distance))
 (export "distanceSq" (func $assembly/index/distanceSq))
 (func $assembly/index/add (param $0 i32) (param $1 i32) (result i32)
  local.get $0
  local.get $1
  i32.add
 )
 (func $assembly/index/distance (param $0 f64) (param $1 f64) (param $2 f64) (param $3 f64) (param $4 f64) (param $5 f64) (result f64)
  local.get $0
  local.get $3
  f64.sub
  local.tee $0
  local.get $0
  f64.mul
  local.get $1
  local.get $4
  f64.sub
  local.tee $0
  local.get $0
  f64.mul
  f64.add
  local.get $2
  local.get $5
  f64.sub
  local.tee $0
  local.get $0
  f64.mul
  f64.add
  f64.sqrt
 )
 (func $assembly/index/distanceSq (param $0 f64) (param $1 f64) (param $2 f64) (param $3 f64) (param $4 f64) (param $5 f64) (result f64)
  local.get $0
  local.get $3
  f64.sub
  local.tee $0
  local.get $0
  f64.mul
  local.get $1
  local.get $4
  f64.sub
  local.tee $0
  local.get $0
  f64.mul
  f64.add
  local.get $2
  local.get $5
  f64.sub
  local.tee $0
  local.get $0
  f64.mul
  f64.add
 )
)
