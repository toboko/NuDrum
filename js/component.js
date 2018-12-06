toastr.options.progressBar = true;
toastr.options.closeButton = true;

const randomCharacter = function() {
  let possible = "abcdefghijklmnopqrstuvwxyz0123456789";
  return possible[Math.floor(Math.random() * possible.length)];
};

const randomBool = function() {
  let possible = [1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0];
  return possible[Math.floor(Math.random() * possible.length)] === 1;
};

const short = function() {
	let out = [],
		str,
		min = 5;

	for (let i = 0; i < min; i++) {
		str = randomCharacter();
		str = randomBool() ? str.toUpperCase() : str;
		out.push(str);
	}
	return out.join("");
};

norm = function (i, l) {
  if (i > l) {
    i = i - l;
  }
  return (i === 0) ? 1 : i;
};

normal = function (i, l, a = true) {
	i = i % l;
	return (i === 0 && a) ? l : i;
};

const rshft = function(arr, places) {
  for (let i = 0; i < places; i++) {
    arr.unshift(arr.pop());
  }
};

const lshft = function(arr, places) {
  for (let i = 0; i < places; i++) {
    arr.push(arr.shift());
  }
};

const findGetParameter = function(parameterName) {
  let result = null,
    tmp = [];
  let items = window.location.search.substr(1).split("&");
  for (let index = 0; index < items.length; index++) {
    tmp = items[index].split("=");
    if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
  }
  return result;
};

Date.dateDiff = function(datepart, diff) {
  datepart = datepart.toLowerCase();
  let divideBy = {
    w: 604800000,
    d: 86400000,
    h: 3600000,
    m: 60000,
    s: 1000
  };

  return Math.floor(diff / divideBy[datepart]);
};

const app = angular.module("drummachineApp", []);
/*  BUG

Attack doesn't work after the first playback of a sound (Chrome)
- https://github.com/alemangui/pizzicato/issues/80

*/

app.controller("DmController", function($scope, $compile) {
  const d = this;
	// Initialize Firebase
  const config = {
	  apiKey: "AIzaSyCPrwHHgupU8jXdlnuulh9_yTYn-Ry2Gqc",
	  authDomain: "nudrum-app.firebaseapp.com",
	  databaseURL: "https://nudrum-app.firebaseio.com",
	  projectId: "nudrum-app",
	  storageBucket: "nudrum-app.appspot.com",
	  messagingSenderId: "1098853194105"
  };

  firebase.initializeApp(config);

  const storage = firebase.storage();

  const db = firebase.database();

	// On load update latest samples link
	// TODO: Save this in cache. If not exists download over firebase
	db.ref("samples/").on("value", data => {

		if (data.exists()) {
			let ones = true,
				child,
				types = Object.entries(data.val());

			types.forEach(function (type) {
				child = document.createElement('optgroup');
				child.setAttribute('id', 'group-' + type[0]);
				child.setAttribute('label', type[0]);

				document.getElementById("inst-sound-type").appendChild(child);

				let elements = Object.entries(type[1]);
				elements.forEach(function (element) {

					if (ones) {
						child = document.createElement('option');
						child.setAttribute('selected', 'selected');
						child.setAttribute('name', element[0]);
						child.setAttribute('value', type[0] + '/' + element[0] + '.wav');
						child.innerHTML = type[0] + ' ' + element[0];

						document.getElementById('group-' + type[0]).appendChild(child);
						ones = false;

					} else {
						child = document.createElement('option');
						child.setAttribute('name', element[0]);
						child.setAttribute('value', type[0] + '/' + element[0] + '.wav');
						child.innerHTML = type[0] + ' ' + element[0];

						document.getElementById('group-' + type[0]).appendChild(child);

					}
				})
			});
		}
	});

  // On load update latest pattern uploaded
  db.ref("patterns/").orderByChild("when").on("value", data => {
      let latestPattern = document.getElementById('latest-pattern');
      latestPattern.innerHTML = '';

      if (data.exists()) {
        data = Object.values(data.val());

        let bytime = data.slice(0);
        bytime.sort(function(a, b) {
          let x = a.when;
          let y = b.when;
          return x > y ? -1 : x < y ? 1 : 0;
        });

        bytime.forEach(function(value) {
          let id = value.id;
          let title = value.title
          let when = value.when;

          let today = Date.now();
          let diff = today - when;

          if (Date.dateDiff("d", diff) >= 15) {
            when = Date.dateDiff("w", diff) + " weeks ago";
          } else if (Date.dateDiff("h", diff) >= 49) {
            when = Date.dateDiff("d", diff) + " days ago";
          } else if (Date.dateDiff("m", diff) >= 121) {
            when = Date.dateDiff("h", diff) + " hours ago";
          } else if (Date.dateDiff("s", diff) >= 121) {
            when = Date.dateDiff("m", diff) + " minutes ago";
          } else if (Date.dateDiff("s", diff) >= 2) {
            when = Date.dateDiff("s", diff) + " seconds ago";
          } else {
            when = "now";
          }

	        let child = document.createElement('div');
          child.classList.add('line-set-large', 'click');
          child.innerHTML = '<div class="line-set-large click">' +
		        '<div class="grid-area-a" data-ng-click="load(\'' +id +"')\">" +
		        "<p><i class=\"fas fa-caret-right\"></i> <strong>[" +id +"]</strong> <small>" +when + "</small> " +
		        "<br>" + title + "</p></div>";
	        let $el = latestPattern.appendChild(child);
          $compile($el)($scope);
        });
      } else {
	      let child = document.createElement('div');
	      child.classList.add('line-set-large', 'click');
	      child.innerHTML = '<div class="grid-area-a"><p>No Patterns</p></div>';
	      let $el = latestPattern.appendChild(child);
	      $compile($el)($scope);
      }
    });

  // MOUSE SENS. ~ px Value
  const MAXMOUSEMOVE = 200;
  const MINMOUSEMOVE = -MAXMOUSEMOVE;
  // VOLUME ~ dB Value
  const MAXVOLUME = 10;
  const MINVOLUME = 0;
  // TEMPO ~ BPM Value
  const DEFAULTTEMPO = 120;
  const MAXTEMPO = 300;
  const MINTEMPO = 40;
  // TONE ~ Hz Value
  const MAXTONE = 2000;
  const MINTONE = 130;
  // KNOB ROTATIONS ~ degree Value
  const MAXROTATION = 125;
  const MINROTATION = -MAXROTATION;

  let playing = false; // play/stop
  let toutPly = null; // playing timeout
  let idxClk = 1; // index clock position

  let tTempo = 0;
  let lstTempo = -1;
  let avgTempo = [0, 0, 0, 0, 0, 0];

  d.trkOn = 0; // index track selected
  d.tempo  = DEFAULTTEMPO;
  d.plyTxt = "PLAY";

  d.beat = {
    4:  { id: 4,  offset:8,  text: "1/4",  rate: 8, ms: 60000 },
    8:  { id: 8,  offset:16, text: "1/8",  rate: 4, ms: 30000 },
    16: { id: 16, offset:32, text: "1/16", rate: 2, ms: 15000 },
    32: { id: 32, offset:64, text: "1/32", rate: 1, ms: 7500 }
  };

  d.defSamples = [
    "Kick/Classic.wav",
    "Snare/Classic.wav",
    "Tom/ClassicMid.wav",
    "Rim/Classic.wav",
    "HitHat/ClassicClose.wav",
    "Crash/Classic.wav",
  ];

  d.pattern = Array(
    { inst: { text: "Bass Drum", mute: false, vol: 5, audio: null }, clock: 1, view: 16, cycle: 0, beat: d.beat[8], steps: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
    { inst: { text: "Snare Drum", mute: false, vol: 5,  audio: null }, clock: 1, view: 16, cycle: 0, beat: d.beat[8], steps: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
    { inst: { text: "Mid Tom", mute: false, vol: 5,  audio: null }, clock: 1, view: 16, cycle: 0, beat: d.beat[8], steps: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
    { inst: { text: "Rim Shot", mute: false, vol: 5, audio: null }, clock: 1, view: 16, cycle: 0, beat: d.beat[8], steps: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
    { inst: { text: "Closed Hihat", mute: false, vol: 5, audio: null }, clock: 1, view: 16, cycle: 0, beat: d.beat[8], steps: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
    { inst: { text: "Crash Cymbal", mute: false, vol: 5, audio: null  }, clock: 1, view: 16, cycle: 0, beat: d.beat[8], steps: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] }
  );

	d.newpattern = {
	  inst: { text: '', mute: false, vol: 5, audio: null }, clock: 1, view: 16, cycle: 0, beat: d.beat[8], steps: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
	};

	$scope.$watch('$viewContentLoaded', function(){
		// fade in
		document.body.classList.remove('fade');
		// play with spacebar
		document.body.onkeyup = function(e){
			if(e.keyCode == 32){
				$scope.startLoop();
			}
		}
		// load url pattern
		let loadPat = findGetParameter("p");
		if (loadPat !== null) {
			$scope.load(loadPat);
		} else {
			$scope.loadAllSample();
		}
	});

	$scope.loadSample = function(sample, inst) {
		storage.ref(sample).getDownloadURL().then(function (url) {
			d.pattern[inst].inst.audio = (
				new Pizzicato.Sound({
					source: "file",
					options: {
						path: url,
						attack: 0,
						release: 0.4
					}
				})
			);

			// Remove blur on loading
			let filterVal = 'blur(0px)';
			document.getElementById("set-" + inst)
				.querySelectorAll("p")
				.forEach(function (value) {
				value.style.filter = filterVal;
				value.style.webkitFilter = filterVal;
				value.style.pointerEvents = 'visible'
			});

			document.getElementById("inst-" + inst)
				.querySelectorAll(".button-step")
				.forEach(function (value) {
				value.style.filter = filterVal;
				value.style.webkitFilter = filterVal;
				value.style.pointerEvents = 'visible'
			});

		}).catch(function(error) {
			// Handle any errors
			toastr.error([sample, error.code].join(' '), error.name);
		});
	};

	$scope.loadAllSample = function() {
		d.defSamples.forEach(function (value, index) {
			$scope.loadSample(value, index);
		})
	};

  /**  TEMPO functions
   *
   *
   *
   * **/

  $scope.detectTempo = function() {
    let avg = 0;
    let now = Math.floor(Date.now());

    if (tTempo && tTempo >= now - 3000) {
      avgTempo.forEach(function(value, index) {
        if (value !== 0) {
          avg += value;
        } else {
          avg += now - tTempo;
          avgTempo[index] = now - tTempo;
        }
      });
    } else {
      // Reset vector
      avgTempo.forEach(function(value, index) {
        avgTempo[index] = 0;
      });
    }

    tTempo = now;
    avg = avg / avgTempo.length;
    lstTempo = (lstTempo + 1) % avgTempo.length;
    avgTempo[lstTempo] = 0;

    if (avg) d.tempo = (Math.trunc(60000 / avg));
  };

  $scope.incTempo = function(inc) {
    let xT = d.tempo;
    xT = inc ? (xT += 1) : (xT -= 1);
    d.tempo = xT;
  };

  /* Edit Functions



   */

  $scope.setBeat = function(inc, inst) {
  	if (playing) {
		  toastr.warning('Beat cannot be set while playing', 'Beat Rules')
	  } else {
		  let oldbeat = (typeof inst !== 'undefined') ? d.pattern[inst].beat.id : d.newpattern.beat.id;
		  let newbeat = oldbeat;
		  // Controls on new beat
		  newbeat = inc ? newbeat * 2 : newbeat / 2;
		  newbeat = newbeat === 2 ? 32 : newbeat;
		  newbeat = newbeat === 64 ? 4 : newbeat;

		  // Add or reduce steps
		  let newoffset = d.beat[newbeat].offset;
		  // Create temp array replacing the old one
		  let tempsteps = Array(newoffset).fill(0);

		  if (typeof inst !== 'undefined') {
			  // Shift active steps
			  d.pattern[inst].steps.forEach(function (val, index, array) {
				  let i2, distance = 0;

				  if (newbeat > oldbeat) {
					  // If we are increasing the beat speed
					  distance = (newbeat / oldbeat);
					  i2 = index * distance;
					  tempsteps[i2] = (array[index] === 1) ? 1 : 0;

				  } else {
					  // If we are reducing the beat speed
					  distance = (oldbeat / newbeat);
					  i2 = (index % distance) ? (index - 1) / distance : index / distance;
					  if (array[index] && tempsteps[i2] === 0) {
						  tempsteps[i2] = 1;
					  }
				  }
			  });

			  // New Beat
			  d.pattern[inst].beat = d.beat[newbeat];
			  // Update Matrix
			  d.pattern[inst].steps = tempsteps;
			  // New offset
			  d.pattern[inst].view = (d.pattern[inst].view > newoffset) ? newoffset : d.pattern[inst].view;

		  } else {
			  // New Beat
			  d.newpattern.beat = d.beat[newbeat];
			  // Update Matrix
			  d.newpattern.steps = tempsteps;
			  // New offset
			  d.newpattern.view = newoffset;
		  }
	  }
  };

  $scope.setOffset = function(inc, inst) {
  	let pattern = d.pattern[inst];

  	if (playing) {
  		toastr.warning('Offset cannot be set while playing', 'Offset Rules')

	  } else {
		  let newoffset = (typeof inst !== 'undefined') ? pattern.view : d.newpattern.view;
		  let maxoffset = (typeof inst !== 'undefined') ? pattern.beat.offset : d.newpattern.beat.offset;

		  newoffset = inc ? (newoffset += 1) : (newoffset -= 1);
		  newoffset = newoffset < 5 ? 5 : newoffset;
		  newoffset = newoffset > maxoffset ? maxoffset : newoffset;

		  if (typeof inst === 'undefined') {
			  d.newpattern.view = newoffset;

		  } else {
			  pattern.view = newoffset;
			  $scope.forkUpUi(inst)
		  }
	  }
  };

  $scope.setVolume = function(inc, inst) {
    let newvol = d.pattern[inst].vol;
    newvol = inc ? (newvol += 1) : (newvol -= 1);
    newvol = newvol <= 0 ? 0 : newvol;
    newvol = newvol >= 10 ? 10 : newvol;
    d.pattern[inst].inst.vol = newvol;

    if (d.pattern[inst].inst.mute) {
      d.pattern[inst].inst.audio.volume = 0;
    } else {
      d.pattern[inst].inst.audio.volume = newvol / MAXVOLUME;
    }
  };

	$scope.delete = function(inst) {
		d.pattern.splice(inst, 1);
		d.defSamples.splice(inst, 1)
		d.trkOn = 0;

		if (d.pattern.length === 0) {
		  $scope.closeEditArea()
    }

		$scope.forkUpUi()
	};

	$scope.select = function(inst) {
		let filterVal = '0'
		let el = document.getElementById('edit-area');
		el.style.webkitTransform = "translateX(" + filterVal + ")";
		el.style.transform = "translateX(" + filterVal + ")";
		d.trkOn = inst;
	};

	$scope.closeEditArea = function() {
		let filterVal = '-100vh'
		let el = document.getElementById('edit-area');
		el.style.webkitTransform = "translateX(" + filterVal + ")";
		el.style.transform = "translateX(" + filterVal + ")";
	};

	$scope.closeBrowseArea = function() {
		let filterVal = '100vh'
		let el = document.getElementById('browse-area');
		el.style.webkitTransform = "translateX(" + filterVal + ")";
		el.style.transform = "translateX(" + filterVal + ")";
	};

  /* Pattern Functions




   */

  $scope.save = function() {
    let id = short();
    // copy pattern
    let pattern = JSON.parse(JSON.stringify(d.pattern));
    // normalize the pattern
    // - clock to 0
    // - audio to null
    pattern.forEach(function(value) {
      value.clock = 1;
      value.inst.audio = null
    });
	  pattern = JSON.stringify(pattern);

	  let samples = JSON.stringify(d.defSamples);
    let when = Date.now();
    let hash = md5(pattern);
    let title = document.getElementById('pattern-new-name').value;
	  let tempo = d.tempo;

	  if (title === '') {
	  	toastr.warning('<strong>Name</strong> is required')
	  } else {
		  // check if there is duplicated pattern
		  db.ref("patterns").orderByChild("hash").equalTo(hash).on("value", snapshot => {
				  // pattern is new
				  if (!snapshot.exists()) {
					  db.ref("patterns/" + id).set(
						  {
							  id: id,
							  hash: hash,
							  tempo: tempo,
							  when: when,
							  pattern: pattern,
							  samples: samples,
							  star: 0,
							  title: title
						  },
						  function (error) {
							  if (error) {
								  // The write failed...
								  toastr.error(error, 'Error!');
							  } else {
								  // Data saved successfully!
								  toastr.success('Pattern uploaded with id <strong>' + id + '</strong>', 'Success');
							  }
						  }
					  );
				  }
			  });
	  }
  };



  $scope.load = function(key) {
  	key = (typeof key !== 'undefined') ? key : document.getElementById('pattern-load-name').value;

  	if (key === '') {
  		toastr.warning('<strong>Pattern Code</strong> is required')
	  } else {
		  db.ref("patterns/" + key).on("value", snapshot => {
			  if (snapshot.exists()) {
				  // Data read successfully!
				  let data = snapshot.val();
				  d.pattern = JSON.parse(data.pattern);
				  d.defSamples = JSON.parse(data.samples);
				  d.tempo = data.tempo;

				  $scope.loadAllSample();
				  $scope.resetClock();
				  $scope.forkUpUi();
			  } else {
				  // The read failed...
			  }
		  });
	  }
  };

  /**  STEPS functions
   *
   *
   *
   * **/
	$scope.selectStep = function(inst, step) {
		let item = document.getElementById("inst-" + inst).querySelector("#step-" + (step + 1));
		d.pattern[inst].steps[step] = item.classList.toggle("select") ? 1 : 0;
	};

  $scope.clear = function(inst) {
	  d.pattern[inst].steps.forEach(function(value, index, array) { array[index] = 0; });
	  $scope.forkUpUi(inst);
  };

  /**  MIX functions
   *
   *
   *
   * **/

  $scope.checkMix = function() {
    d.pattern.forEach(function(value) {
      if (value.inst.audio != null && !value.mute)
        value.inst.audio.volume = value.vol / MAXVOLUME;
    });
  };

  $scope.mute = function(inst) {
    d.pattern[inst].inst.mute = !d.pattern[inst].inst.mute;
    d.pattern[inst].inst.audio.volume = d.pattern[inst].inst.mute ? 0.0 : d.pattern[inst].inst.vol / MAXVOLUME;
    if (d.pattern[inst].inst.mute) {
	    document.getElementById('set-' + inst).querySelector('.mute').innerHTML = '<i class="fas fa-volume-mute"></i>';
    } else {
	    document.getElementById('set-' + inst).querySelector('.mute').innerHTML = '<i class="fas fa-volume-up"></i>';
    }
  };

  /**  PLAYING functions
   *
   *
   *
   * **/
  $scope.resetClock = function( inst ) {
    let patterns = (typeof inst !== 'undefined') ? inst : d.pattern;
    patterns.forEach(function(element, index) {
	    if (element.view < element.beat.offset) {
		    // Shift left steps to restore the original position
		    lshft(element.steps, element.cycle * element.view)
	    }
	    element.cycle = 0;
	    element.clock = 1;
    });
  };

  $scope.startLoop = function() {
    playing = !playing;

    if (!playing) {
      // STOP

      // reset indexClock
      idxClk = 1;
      // reset instrument clock
      $scope.resetClock();
      // clear loop timeout
      clearTimeout(toutPly);
      // clean graphics change
	    document.querySelectorAll('.button-step').forEach(function (value) {
		    value.classList.remove('clock');
	    })
      // change status text
      d.plyTxt = "START";

      $scope.forkUpUi();

    } else {
      // PLAY

      // check instruments volume
      $scope.checkMix();
      // play loop
      $scope.play();
      // change status text
      d.plyTxt = "STOP";
    }
  };

  $scope.play = function() {
    // playing sounds
    d.pattern.forEach(function(value, inst) {

      // clock is in time with beat rate
      if ( idxClk % value.beat.rate === 1) {
        $scope.playInst(inst, d.pattern[inst]);

      } else if(value.beat.rate === 1) {
        $scope.playInst(inst, d.pattern[inst]);
      }
    });

    // inc global clock value
    idxClk = norm((idxClk + 1), d.beat[32].offset);

    // timeout loop
    toutPly = window.setTimeout(function() {
        $scope.play();
      },(d.beat[32].ms ) / d.tempo);
  };

  // Play the single instrument in own beat tempo
  $scope.playInst = function(inst, element) {
    let beat  = element.beat.offset;
    let view  = element.view;

	  let tcycle = normal(element.clock, view);    // Identify when a cycle finished
	  let tbeat  = normal(element.clock, beat); 	 // Identify the clock position on the steps


	  if (element.steps[tbeat-1]) {
      if (element.inst.audio.playing) {
        element.inst.audio.stop();
      }
      // Play sample
      element.inst.audio.play();
	  }

    if ((tcycle === 1) && (element.cycle !== 0) && (view !== beat)) {
    	// Update UI
	    $scope.forkUpUi(inst);
    }

    // select clock step on instrument line steps
    $scope.upClock(inst, tbeat);

    // inc clock instrument value
	  element.clock = (element.clock += 1);

	  tcycle = normal(element.clock, view);

	  if (tcycle === 1) {
		  // Counting the cycle
		  element.cycle = (element.cycle += 1);

		  if (view !== beat) {
			  // Right shift elements array
			  rshft(element.steps, view);
		  }
	  }

  };


  $scope.newInst = function () {
	  let nameinst = document.getElementById('inst-new-name').value;

	  if (playing) {
		  toastr.warning('Instruments cannot be created while playing', 'Instrument Rules')
	  } else {

		  if (nameinst === '') {
			  toastr.warning('<strong>Name</strong> is required');

		  } else {
			  d.newpattern.inst.text = nameinst;
			  d.pattern.push(d.newpattern);
			  d.newpattern = {
				  inst: {text: '', mute: false, vol: 5, audio: null},
				  clock: 1,
				  view: 16,
				  cycle: 0,
				  beat: d.beat[8],
				  steps: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
			  };

			  let urlinst = document.getElementById('inst-sound-type').value;

			  d.defSamples.push(urlinst);

			  $scope.loadSample(urlinst, d.pattern.length - 1);
		  }
	  }
  };

  $scope.upClock = function (inst, step) {
    if (playing) {
	    // Update clock status on instruments's steps
	    let el = document.getElementById("inst-" + inst)
	    el.querySelectorAll(".button-step").forEach(function (value) {
	    	value.classList.remove('clock')
	    });
	    el.querySelector("#step-" + step).classList.add('clock');
    }
  };

  $scope.forkUpUi = function (inst) {
	  d.pattern.every(function(pattern, index) {
      if (typeof inst !== 'undefined') {
        if (index === inst)  {
          updateSteps(pattern, inst);
          return false;
        }
        return true;
      } else {
	      updateSteps(pattern, index);
        return true;
      }
    });
  };


	let updateSteps = function (pattern, inst) {
			let steps = document.getElementById("inst-" + inst).querySelectorAll(".button-step");

			// Blur instruments on loading
			if (pattern.inst.audio === null) {

				let filterVal = 'blur(5px)';

				document.getElementById("set-" + inst).querySelectorAll('p').forEach(function (value) {
					value.style.filter = filterVal;
					value.style.webkitFilter = filterVal;
					value.style.pointerEvents = 'none'
				});

				steps.forEach(function (value) {
					value.style.filter = filterVal;
					value.style.webkitFilter = filterVal;
					value.style.pointerEvents = 'none'
				});
			}

			for (let a = 0; a < pattern.steps.length; a++) {

				if (pattern.view < pattern.beat.offset) {
					let x = normal(pattern.view * pattern.cycle, pattern.beat.offset, false);
					let y = normal((pattern.view * pattern.cycle) + pattern.view - 1, pattern.beat.offset, false);

					if (y < x) {
						if (a > y && a < x) {
							steps[a].classList.add("disabled");

						} else {
							steps[a].classList.remove("disabled");
						}
					} else {
						if (a < x || a > y) {
							steps[a].classList.add("disabled");

						} else {
							steps[a].classList.remove("disabled");
						}
					}
				} else {
					if (a > (pattern.view - 1)) {
						steps[a].classList.add("disabled");

					} else {
						steps[a].classList.remove("disabled");
					}
				}

				if (pattern.steps[a] === 1) {
					steps[a].classList.add("select");
				} else {
					steps[a].classList.remove("select");
				}
			}
	};

  $scope.$on('onRepeatLast', function(scope, element, attrs) {
    // Do some stuffs here
	  let inst = parseInt(element[0].parentElement.parentElement.getAttribute('id').substr(5));
    $scope.forkUpUi(inst)
  });
});

app.directive('onLastRepeat', function() {
  return function(scope, element, attrs) {
    if (scope.$last) {
      scope.$emit('onRepeatLast', element, attrs);
    }
  };
});

app.filter('range', function() {
  return function(input, total) {
    total = parseInt(total);

    for (let i=0; i<total; i++) {
      input.push(i);
    }

    return input;
  };
});