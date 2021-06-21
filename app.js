'use strict';

import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/build/three.module.js';

function main() {
  // create WebGLRenderer
  const canvas = document.querySelector('#canvas');
  const renderer = new THREE.WebGLRenderer({
    canvas
  });
  renderer.autoClearColor = false; // 평면 메쉬에 애니메이션을 줄 게 아니므로 렌더러가 다음 프레임에서 새로 렌더할 때마다 기존의 color buffer를 굳이 지우지 않도록 비활성화 시킨 것.

  // Orthographic camera 생성. 평면 메쉬를 배경으로 찍어서 보여주려는 거니까 2D 형태로 찍어서 보여주기 적합한 정사영 카메라를 사용한 것.
  const camera = new THREE.OrthographicCamera(
    // left, right, top, bottom 값을 전달해준 것을 보면 카메라 width, height은 2*2 사이즈로 지정되겠군
    -1, // left
    1, // right
    1, // top
    -1, // bottom 
    -1, // near
    1 // far
  );

  // create scene
  const scene = new THREE.Scene();

  // 배경용 평면 메쉬를 생성하려고 함.
  const plane = new THREE.PlaneGeometry(2, 2); // 정사영 카메라의 사이즈와 동일하게 잡아줘야 함. 말그대로 배경으로 쓰이는 메쉬를 만들거니까

  // 베이직-머티리얼 대신 ShaderMaterial을 사용해서 배경 메쉬를 렌더해줄 것임.
  // 이 때, ShaderMaterial에 사용되는 쉐이더 코드를 쉐이더토이 웹사이트에 있는 쉐이더 하나를 가져와서 사용하려는 것.
  // 이 쉐이더 코드에 대한 자세한 설명은 튜토리얼 웹사이트에 자세하게 나와있으므로 참고할 것.
  // 참고로 fragCoord는 이 쉐이더를 적용하는 캔버스의 각 픽셀의 좌표값을 계속 넣어줌.
  // 그래서 만약 300 * 400 캔버스에 적용한다면, mainImage 함수는 300*400 즉, 120000번 호출되면서 fragCoord에 캔버스의 각 픽셀의 좌표값들을 순차적으로 전달해 주는거지.
  // 그니까 이러한 캔버스이 vec2(x, y)좌표값을 iResolution.xy 즉, vec2(300, 400)로 나누면 
  // vec2 uv에는 매번 호출될 때마다 (0, 0) ~ (1, 1) 사이의 값이 순차적으로 할당되겠지.
  // 이런식으로 쉐이더토이의 메인 함수는 캔버스의 좌표값을 정규화해서 사용하는 게 작업을 간단히 하는 데 도움이 되기 때문에 저런 식으로 많이 사용함.
  // 또한 이거는, 한 프레임에서의 캔버스를 그려낼 때 120000 호출해서 캔버스의 각 픽셀들의 좌표값을 도는거임.
  // 각 픽셀 좌표마다 fragColor값을 계산해서 색상값을 찍어주는 것 -> 픽셀마다 색상이 달라져서 그라데이션이 생기게 되는거임.
  // 여기에 animate 함수에서 매번 iTime값을 타임스탬프값으로 갱신해줘야 그라데이션이 움직이는 애니메이션이 발생하는 것! 
  const fragmentShader = `
  #include <common>

  uniform vec3 iResolution;
  uniform float iTime;

  // By iq: https://www.shadertoy.com/user/iq  
  // license: Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.
  void mainImage( out vec4 fragColor, in vec2 fragCoord )
  {
      // Normalized pixel coordinates (from 0 to 1)
      vec2 uv = fragCoord/iResolution.xy;

      // Time varying pixel color
      // vec3 col = 0.5 + 0.5*cos(iTime+uv.xyx + vec3(0,2,4));
      vec3 col = 0.5 + 0.5*cos(iTime+uv.xyx * 40.0 + vec3(0,2,4));

      // Output to screen
      fragColor = vec4(col,1.0);
  }

  void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
  }
  `;

  // 쉐이더 코드에 전달할 균등 변수(즉, uniforms 값)을 생성함.
  const uniforms = {
    iTime: {
      value: 0
    },
    iResolution: {
      value: new THREE.Vector3()
    } // 원래 iResolution은 캔버스의 해상도값이 들어가는 거니까 Vector2를 넣어줘도 될 것 같은데, 왜 쉐이더 코드에서 vec3로 사용하는지는 모르겠다고 함.
  }

  // 균등 변수 uniforms, fragmentShader 코드를 넘겨줘서 ShaderMaterial을 생성함.
  // 참고로 ShaderMaterial 은 THREE.JS의 built-in 머티리얼로 구현할 수 없는 머티리얼을 사용자가 직접 작성한 쉐이더 코드를 이용해서 만드는 커스텀 머티리얼이라고 할 수 있음.
  // 그래서 일반적으로는 uniforms, vertexShader, fragmentShader 를 넘겨줘서 머티리얼을 생성함.
  const material = new THREE.ShaderMaterial({
    fragmentShader,
    uniforms
  });

  // 배경 메쉬를 만들어서 씬에 추가함.
  scene.add(new THREE.Mesh(plane, material));

  // resize renderer
  function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }

    return needResize;
  }

  // animate
  function animate(t) {
    t *= 0.001; // 초 단위의 타임스탬프값을 밀리초 단위로 변환

    resizeRendererToDisplaySize(renderer);

    // 캔버스가 리사이징될 경우를 고려해 매 프레임마다 균등변수(uniforms)안의 캔버스 해상도인 iResolution의 값을 현재 캔버스 해상도로 매번 지정해줘야 함.
    // 또한 iTime의 값도 매 프레임마다 초단위의 타임스탬프값으로 넘겨줘야 함
    const canvas = renderer.domElement;
    uniforms.iResolution.value.set(canvas.width, canvas.height, 1); // vec3 값이라서 3개의 값을 전달해줘야 하니까 갯수 맞추기용으로 1을 넣어준 것.
    uniforms.iTime.value = t;

    renderer.render(scene, camera);

    requestAnimationFrame(animate); // 내부에서 반복 호출
  }

  requestAnimationFrame(animate);
}

main();