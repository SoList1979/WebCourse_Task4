function RGBA(mainCode, props) {
    let config = props || {};
    config.mainCode = mainCode;
    let canvas = document.createElement("canvas");
    let fire = document.getElementById("bg");

    // 🔽 Добавить эти две строки:
    const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
        );
    const isNarrow = window.innerWidth / window.innerHeight < 1.1;

    let canheight = fire.offsetHeight;
    let canwidth = fire.offsetWidth;
    let gl = (this.gl = canvas.getContext("webgl"));
    let program = gl.createProgram();
    config.uniforms = config.uniforms || {};
    config.uniforms.time = "1f";
    config.uniforms.resolution = "2f";
    config.vertexShader =
        config.vertexShader ||
        `attribute vec2 vert;
	void main(void) {
	gl_Position = vec4(vert, 0.0, 1.0);
	}`;
    if (config.mainCode.indexOf("void main(void)") === -1)
        config.mainCode = `\nvoid main(void) {\n${config.mainCode}\n}`;
    if (!config.fragmentShader) {
        config.fragmentShader =
            "\n" +
            Object.keys(config.uniforms)
                .map((uf) => {
                    let type = config.uniforms[uf][0];
                    return `uniform ${
                        type - 1 ? "vec" + type : "float"
                    } ${uf};`;
                })
                .join("\n") +
            "\n";
        if (config.textures)
            config.fragmentShader += `\nuniform sampler2D tex[${config.textures.length}];\n`;
        config.fragmentShader += config.mainCode;
    }
    config.fragmentShader =
        `precision ${config.precision || "mediump"} float;\n` +
        config.fragmentShader;
    [config.vertexShader, config.fragmentShader].forEach((src, i) => {
        let id = gl.createShader(i ? gl.FRAGMENT_SHADER : gl.VERTEX_SHADER);
        gl.shaderSource(id, src);
        gl.compileShader(id);
        let message = gl.getShaderInfoLog(id);
        gl.attachShader(program, id);
        if (message.length > 0 || config.debug)
            console.log(
                src
                    .split("\n")
                    .map(
                        (str, i) => ("" + (1 + i)).padStart(4, "0") + ": " + str
                    )
                    .join("\n")
            );
        if (message.length > 0) throw message;
    });
    gl.linkProgram(program);
    gl.useProgram(program);
    Object.keys(config.uniforms).forEach((uf) => {
        let location = gl.getUniformLocation(program, uf);
        let func = gl[`uniform${config.uniforms[uf]}`];
        this[uf] = (v) => func.call(gl, location, ...v);
    });
    if (config.textures) {
        gl.uniform1iv(
            gl.getUniformLocation(program, "tex"),
            config.textures.map((_, i) => i)
        );
        config.textures.forEach((urlOrSvg, index) => {
            let loader = new Image();
            loader.crossOrigin = "anonymous";
            loader.src = urlOrSvg;
            loader.onload = function () {
                let texture = gl.createTexture();
                gl.activeTexture(gl.TEXTURE0 + index);
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
                gl.texImage2D(
                    gl.TEXTURE_2D,
                    0,
                    gl.RGBA,
                    gl.RGBA,
                    gl.UNSIGNED_BYTE,
                    loader
                );

                gl.texParameteri(
                    gl.TEXTURE_2D,
                    gl.TEXTURE_MIN_FILTER,
                    gl.LINEAR
                );
                gl.texParameteri(
                    gl.TEXTURE_2D,
                    gl.TEXTURE_WRAP_S,
                    gl.CLAMP_TO_EDGE
                );
                gl.texParameteri(
                    gl.TEXTURE_2D,
                    gl.TEXTURE_WRAP_T,
                    gl.CLAMP_TO_EDGE
                );
            };
        });
    }
    let triangle = new Float32Array([-1, 3, -1, -1, 3, -1]);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, triangle, gl.STATIC_DRAW);
    let vert = gl.getAttribLocation(program, "vert");
    gl.vertexAttribPointer(vert, 2, gl.FLOAT, 0, 0, 0);
    gl.enableVertexAttribArray(vert);
    this.newSize = (w, h) => {
        this.resolution([(canvas.width = w), (canvas.height = h)]);
        gl.viewport(0, 0, w, h);
    };
    fire.append(canvas);
    this.newSize(canwidth, canheight);
    window.addEventListener("resize", function () {
        w = fire.offsetWidth;
        h = fire.offsetHeight;
        this.newSize(w, h);
    });
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (false !== config.loop) {
        let drawFrame = (t) => {
            this.time([t / 1000]);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            // 🔽 Условие: продолжать анимацию ТОЛЬКО если НЕ мобильное и НЕ узкое
            if (!isMobile && !isNarrow) {
                requestAnimationFrame(drawFrame);
            }
        };
        requestAnimationFrame(drawFrame);
    }
}

RGBA(`
    vec3 firePalette(float i) {
	float T = 1400. + 1300.*i; 
	vec3 L = vec3(7.4, 5.6, 4.4); 
	L = pow(L,vec3(5.0)) * (exp(1.43876719683e5/(T*L))-1.0);
	return 1.0-exp(-5e8/L); 
    }    
    vec3 hash33(vec3 p) { 
	float n = sin(dot(p, vec3(7, 157, 113)));    
	return fract(vec3(2097152, 262144, 32768)*n); 
    }
    float voronoi(vec3 p) {
	vec3 b, r, g = floor(p);
	p = fract(p); 
	float d = 1.; 
	for(int j = -1; j <= 1; j++) {
	for(int i = -1; i <= 1; i++) {
	b = vec3(i, j, -1);
	r = b - p + hash33(g+b);
	d = min(d, dot(r,r));
	b.z = 0.0;
	r = b - p + hash33(g+b);
	d = min(d, dot(r,r));
	b.z = 1.;
	r = b - p + hash33(g+b);
	d = min(d, dot(r,r));	
	}
	}
	return d;
    }
    float noiseLayers(in vec3 p) {
	vec3 t = vec3(0., 0., p.z+time); 
	float tot = 0., sum = 0., amp = 1.; 
	for (int i = 0; i < 6; i++) {
	tot += voronoi(p + t) * amp; 
	p *= 2.0; 
	t *= 1.5; 
	sum += amp; 
	amp *= 0.5; 
	}
	return tot/sum; 
    }
    void main(void) {
	vec2 uv = (gl_FragCoord.xy - resolution.xy*0.5)/ resolution.y;
	vec3 rd = normalize(vec3(uv.x, uv.y, 3.1415/8.));
	float c = noiseLayers(rd*4.); 
	vec3 col = firePalette(c);
	gl_FragColor = vec4(sqrt(col), 1.);  
    }
	
`);
