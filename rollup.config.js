// rollup.config.js
import resolve  from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

export default [
  // bundle for the MFA‐popup controller
  {
    input: "mfa/script.js",
    output: {
      file: "mfa/dist/script.bundle.js",
      format: "iife",
      sourcemap: true
    },
    plugins: [ resolve({ browser: true }), commonjs() ]
  },
  // bundle for the register/login page
  {
    input: "mfa/register.js",
    output: {
      file: "mfa/dist/register.bundle.js",
      format: "iife",
      sourcemap: true
    },
    plugins: [ resolve({ browser: true }), commonjs() ]
  }
];
