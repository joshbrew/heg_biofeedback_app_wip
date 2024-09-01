import './videocontrols.css'

type CB = (
  srcOrId?:string|MediaProvider|null, 
  videoOrImage?:HTMLVideoElement|HTMLImageElement
)=>void

export function isMobile() {
  let check = false;
  (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||(window as any).opera);
  return check;
};

export class MediaElementCreator {
  fileInput: HTMLInputElement;
  videoSelect: HTMLSelectElement;
  parentElement:HTMLElement;
  mediaOptions: MediaStreamConstraints;
  currentMediaElement: HTMLImageElement | HTMLVideoElement | null = null;
  oncreate?: CB;
  onstarted?: CB;
  ondelete?: CB;
  onended?: CB;
  ontargetchanged?: CB;

  
  controlsParent:HTMLElement;
  controlsDialog:HTMLDivElement;
  toggleDialogButton:HTMLButtonElement;
  currentTrack:MediaStreamTrack;

  constructor(
    parentElement: HTMLElement,
    callbacks?: {
      oncreate?: CB,
      onstarted?: CB,
      ondelete?: CB,
      onended?: CB,
      ontargetchanged?: CB
    },
    mediaOptions?: MediaStreamConstraints,
    autostart = true,
    includeAudio = false,
    powerSave = isMobile(), //default to power save options on mobile 
    includeFileSelector = true,
    includeDeviceIdSelector = true
  ) {
    this.parentElement = parentElement;
    this.mediaOptions = mediaOptions || {
      audio: false,
      video: {
        width: { min:480, ideal:3840 },
        height:{ min:320, ideal:2160 },
        zoom:true
      } as any
    };

    //limit resolution and framerate to save power
    if(powerSave && typeof this.mediaOptions.video === 'object') {
      if(typeof (this.mediaOptions.video?.width as any) === 'object') 
        (this.mediaOptions.video?.width as any).ideal = 1920;
      if(typeof (this.mediaOptions.video?.height as any) === 'object') 
        (this.mediaOptions.video?.height as any).ideal = 1080;

      this.mediaOptions.video.frameRate = {min: 10, ideal: 30};
    }
    
    this.oncreate = callbacks?.oncreate;
    this.onstarted = callbacks?.onstarted;
    this.ondelete = callbacks?.ondelete;
    this.ontargetchanged = callbacks?.ontargetchanged;

    let controlsDiv = document.createElement('div');
    this.parentElement.appendChild(controlsDiv);

    if (includeFileSelector)     this.createFileInputElement(controlsDiv);
    if (includeDeviceIdSelector) this.createVideoSelectElement(controlsDiv, includeAudio);

    // Initialize the controls dialog
    this.initializeControlsDialog(controlsDiv);

    if(autostart)
      setTimeout(()=>{ //give it a moment to enumerate
        if(this.videoSelect.value) this.getVideoStream(this.mediaOptions);
      },100);
  }

  createFileInputElement(parent:HTMLElement) {
    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = 'image/*, video/*';
    this.fileInput.addEventListener('change', (event) => {
        const target = event.target as HTMLInputElement;
        if (target.files && target.files[0]) {
            const file = target.files[0];
            this.createMediaElement(file);
        }
    });
    this.fileInput.onclick = (ev:any) => {
      this.fileInput.value = "";
    }
    parent.appendChild(this.fileInput);
  }

  createVideoSelectElement(parent:HTMLElement, includeAudio:boolean) {
    this.videoSelect = document.createElement('select');
    this.setupVideoInputOptions(includeAudio);
    parent.appendChild(this.videoSelect);
    let button = document.createElement('button');
    button.innerHTML = "Stream";
    button.onclick = () => {
      this.setStream(includeAudio);
    }
    parent.appendChild(button);
  }

  setStream = (includeAudio?: boolean) => {
    const deviceId = this.videoSelect.value;
    (this.mediaOptions.video as any).deviceId = deviceId; // Potential overwrite
  
    if (!this.mediaOptions.video || typeof this.mediaOptions.video !== 'object') {
      this.mediaOptions.video = {};
    }

    const options: MediaStreamConstraints = {
      ...this.mediaOptions,
      video: {
        ...this.mediaOptions.video,
        deviceId: { exact: deviceId } // Correctly applied here
      }
    };
  
    if (includeAudio) Object.assign(options, { audio: true });
    this.getVideoStream(options);
  }

  setupVideoInputOptions = async (includeAudio:boolean) => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');

    this.videoSelect.innerHTML = videoDevices
      .map(device => typeof device.deviceId !== undefined ? `<option value="${device.deviceId}">${device.label || device.deviceId}</option>` : ``)
      .join('');

    this.videoSelect.addEventListener('change', ()=>{this.setStream(includeAudio);});
  }

  async getVideoStream(options: MediaStreamConstraints) {
    try {

      const stream = await navigator.mediaDevices.getUserMedia(options);
      
      //no ios
      //const track = stream.getVideoTracks()[0];
      //let capture = new ImageCapture(track);
      //let capabilities = Promise.all([capture.getPhotoCapabilities(), capture.getPhotoSettings()]);
      //capabilities.then((res)=>{console.log("CAPTURE CAPABILITIES: ",...res);});

      this.createVideoElement(stream, (options?.video as any)?.deviceId);

      
      const [videoTrack] = stream.getVideoTracks();
      this.createControlElements(videoTrack);
      this.currentTrack = videoTrack;
    } catch (error) {
      console.error('Error accessing the webcam', error);
    }
  }

  // Helper to create a dropdown control for mode settings
  createSelectControl(labelText, options, currentSetting, onChangeCallback) {
    const label = document.createElement('label');
    label.textContent = labelText + ": ";
    const select = document.createElement('select');

    this.controlElements[labelText] = select; 

    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        optionElement.selected = option === currentSetting;
        select.appendChild(optionElement);
    });

    select.addEventListener('change', () => onChangeCallback(select.value));
    if(this.controlsDialog)
      this.controlsDialog.appendChild(label); // This ensures it's inside the dialog)
    else this.parentElement.appendChild(label);
    label.appendChild(select);
  }

  // Helper to create a slider control for numeric values
  createSliderControl(labelText, capabilities, currentSetting, onChangeCallback) {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.justifyContent = 'space-between';
    container.style.alignItems = 'center';
    container.style.padding = '10px'; // Add padding for better spacing

    const label = document.createElement('label');
    label.textContent = labelText + ": ";
    label.style.flex = '2'; // Adjusted for relative sizing
    label.style.whiteSpace = 'nowrap'; // Prevent the label from wrapping
    label.style.overflow = 'hidden'; // Hide overflow
    label.style.textOverflow = 'ellipsis'; // Add ellipsis for overflow text
    label.style.fontSize = '0.9em'; // Relative font size

    const valueDisplay = document.createElement('input');
    valueDisplay.type = 'number';
    valueDisplay.min = capabilities.min;
    valueDisplay.max = capabilities.max;
    valueDisplay.step = capabilities.step;
    valueDisplay.value = currentSetting;
    valueDisplay.style.fontFamily = 'Consolas, "Courier New", monospace';
    valueDisplay.style.flex = '1'; // Ensure this doesn't grow too much
    valueDisplay.style.textAlign = 'right'; // Align the text to the right
    valueDisplay.style.fontSize = '0.9em'; // Use relative sizing
    valueDisplay.style.width = '10%';
    valueDisplay.style.overflow = 'hidden'; // Hide overflow
    valueDisplay.style.textOverflow = 'ellipsis'; // Add ellipsis for overflow text

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = capabilities.min;
    slider.max = capabilities.max;
    slider.step = capabilities.step || 1; // Default step to 1 if not specified
    slider.value = currentSetting;
    slider.style.flex = '3'; // Allow the slider to grow, adjust as needed
    slider.style.maxWidth = '200px'; // Fixed width for the slider

    this.controlElements[labelText] = { control: slider, label: valueDisplay };

    slider.addEventListener('input', () => {
      const value = parseFloat(slider.value);
      valueDisplay.value = `${value}`; // Update the display value
      onChangeCallback(value);
    });

    valueDisplay.addEventListener('change', () => {
      let value = parseFloat(valueDisplay.value);
      slider.value = valueDisplay.value; 
      onChangeCallback(value);
    });
    
    // Determine where to append the slider control
    //if (labelText.toLowerCase().includes('zoom')) { 
    //    this.controlsParent.appendChild(container); // Directly on the parent for immediate access
    //} else {
        this.controlsDialog.appendChild(container); // Inside the dialog for other settings
    //}

    container.appendChild(label);
    container.appendChild(slider);
    container.appendChild(valueDisplay); // Append the value display to the container
  }

  // Helper to create toggle control for boolean values
  createToggleControl(labelText, currentState, onChangeCallback) {
    const label = document.createElement('label');
    label.textContent = labelText + ": ";
    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.checked = currentState;

    this.controlElements[labelText] = toggle;

    toggle.addEventListener('change', () => onChangeCallback(toggle.checked));
    if (this.controlsDialog) {
      this.controlsDialog.appendChild(label); // Inside the dialog for other settings
    } else {
      this.parentElement.appendChild(label); // Directly on the parent for immediate access 
    }
    label.appendChild(toggle);
  }

  // New helper for pointsOfInterest, which requires a unique approach
  createPointsOfInterestControl(track) {
    const poiButton = document.createElement('button');
    poiButton.textContent = "Set Points of Interest";
    poiButton.addEventListener('click', () => {
        // This example assumes a method to capture click events on the video to set points of interest
        // Implement your method to capture points of interest here
        // For simplicity, this is a placeholder for actual implementation
        console.log("Implement POI selection logic");
        // After selecting POIs, apply constraints with something like:
        // track.applyConstraints({ advanced: [{ pointsOfInterest: [{x: 0.5, y: 0.5}] }] });
    });
    
    this.parentElement.appendChild(poiButton);
  }


  initializeControlsDialog(parentElement) {
      // Create the dialog container
      this.controlsDialog = document.createElement('div');
      this.controlsDialog.style.display = 'none'; // Hidden by default

      Object.assign(this.controlsDialog.style,{
        position:'absolute',
        zIndex:'2',
        backgroundColor:'rgba(10,10,10,0.5)',
        flexDirection:'column'
      } as CSSStyleDeclaration);

      this.controlsDialog.setAttribute('class', 'controls-dialog');

      // Optionally, add a button to show/hide the dialog
      this.toggleDialogButton = document.createElement('button');
      
      this.toggleDialogButton.style.display = 'none'; //hidden till we access getUserMedia
      this.toggleDialogButton.textContent = 'Show Camera Settings';
      this.toggleDialogButton.addEventListener('click', () => {
          const isDisplayed = this.controlsDialog.style.display === 'flex';
          this.controlsDialog.style.display = isDisplayed ? 'none' : 'flex';
          this.toggleDialogButton.textContent = isDisplayed ? 'Show Camera Settings' : 'Hide Camera Settings';
      
          // Start or stop the monitoring loop based on the dialog visibility
          if (isDisplayed) {
              this.stopMonitoringLoop();
          } else {
              this.startMonitoringLoop(this.currentTrack); // Ensure `this.currentTrack` is updated to the current track elsewhere in your code
          }
      });


      parentElement.appendChild(this.toggleDialogButton);
      parentElement.appendChild(this.controlsDialog);
      this.controlsParent = parentElement;
      
  }

  controlElements:any = {};
  monitoringInterval;

  // Method to create controls based on the video track capabilities
  //https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints#exposuremode
  createControlElements(track) {
    this.clearControlElements();
    const capabilities = track.getCapabilities();
    const settings = track.getSettings();
    this.toggleDialogButton.style.display = '';
    
    
    //console.log(capabilities); //check this for more settings we could add

    // Continue creating controls for each capability...
    // The following are additional examples for other settings

    // Handle the creation of controls for whiteBalanceMode, exposureMode, and focusMode
    [
      'whiteBalanceMode', 
      'exposureMode', 
      'focusMode',
      'resizeMode'
    ].forEach(setting => {
      if (capabilities[setting]) {
          this.createSelectControl(setting.charAt(0).toUpperCase() + setting.slice(1).replace(/([A-Z])/g, ' $1'), // Format the label text
              capabilities[setting], settings[setting], value => {
                  let constraint = {};
                  constraint[setting] = value;
                  track.applyConstraints({ advanced: [constraint] });
              });
      }
    });


    // Numeric options: colorTemperature, iso, etc.
    [
      'zoom',
      'colorTemperature', 
      'iso', 
      'brightness', 
      'contrast', 
      'saturation', 
      'sharpness', 
      'focusDistance',
      'exposureTime',
      'exposureCompensation',
      'frameRate',
      //'aspectRatio' //pretty jank
    ].forEach(setting => {
        if (capabilities[setting]) {
            this.createSliderControl(setting.replace(/([A-Z])/g, ' $1'), // Add spaces before capital letters for readability
                capabilities[setting], settings[setting], value => {
                    let constraint = {};
                    constraint[setting] = value;
                    track.applyConstraints({ advanced: [constraint] });
                });
        }
    });

    // Boolean option: torch
    if ('torch' in capabilities) {
        this.createToggleControl('Torch', settings.torch, value => {
            track.applyConstraints({ advanced: [{ torch: value }] });
        });
    }

    // Special handling for pointsOfInterest as it requires custom logic
    if ('pointsOfInterest' in capabilities) {
        this.createPointsOfInterestControl(track);
    }

    // Handling for facingMode, aspectRatio, frameRate, height, width as dropdowns if they have discrete values
    ['facingMode', 'aspectRatio', 'frameRate', 'height', 'width'].forEach(setting => {
        if (capabilities[setting] && Array.isArray(capabilities[setting]) && capabilities[setting].length > 0) {
            this.createSelectControl(setting.replace(/([A-Z])/g, ' $1'), // Add spaces before capital letters for readability
                capabilities[setting], settings[setting], value => {
                    let constraint = {};
                    constraint[setting] = value;
                    track.applyConstraints({[setting]: value});
                });
        }
    });
  }

  clearControlElements() {
    this.controlElements = {}; //new 
    this.controlsDialog.innerHTML = '';
  }


  startMonitoringLoop(track) {
    if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
    }

    let lastValues = {} as any;
    this.monitoringInterval = setInterval(() => {
        // Fetch current track settings
        const settings = track.getSettings();

        // Update control values
        for (const key in this.controlElements) {
          if(typeof settings[key] === 'undefined' || settings[key] !== lastValues[key]) continue;
          console.log(settings[key], typeof settings[key])
          lastValues[key] = settings[key];
          const controlInfo = this.controlElements[key];
          if (typeof controlInfo === 'object') { // For sliders with labels
            if(controlInfo.control && controlInfo.label) {
              controlInfo.control.value = settings[key];
              controlInfo.label.textContent = settings[key];
            } else if (controlInfo.tagName === 'SELECT') { // For select elements
              controlInfo.value = settings[key];
            } else if (controlInfo.type === 'checkbox') {
              controlInfo.checked = settings[key];
            }
          }
        }
    }, 1000); // 2fps -> 500ms per frame
  }

  stopMonitoringLoop() {
      if (this.monitoringInterval) {
          clearInterval(this.monitoringInterval);
          this.monitoringInterval = null;
      }
  }

  createMediaElement(file: File) {
    const url = URL.createObjectURL(file);
    if(this.oncreate) this.oncreate(file.name, undefined);
    
    if (file.type.startsWith('image/')) {
      this.createImageElement(url);
    } else if (file.type.startsWith('video/')) {
      this.createVideoElement(url);
    } else {
      console.error('Unsupported file type:', file.type);
    }
  }

  createImageElement(src: string) {
    const image = new Image();
    image.src = src;
    image.onload = () => {
      this.deinitMediaElement();
      const imageSpan = document.createElement('span');
      imageSpan.appendChild(image);
      this.parentElement.appendChild(imageSpan);
      this.currentMediaElement = image;
      if(this.ontargetchanged) this.ontargetchanged(src, image);
    };
  }

  createVideoElement(src: string | MediaStream, deviceId?: string) {

    this.deinitMediaElement();

    const video = document.createElement('video');
    video.classList.add('video-element');
    video.autoplay = true;

    video.loop = true;
    video.muted = true; // Mute to allow autoplay without user interaction
    
    
    if (typeof src === 'string') {
      video.src = src;
      if(this.oncreate) this.oncreate(src, video);
    } else {
      video.srcObject = src;
      video.onloadedmetadata = () => {
        if(this.onstarted) this.onstarted(deviceId, video);
      };
    }
    
    video.onplay = () => {
      if(this.onstarted) this.onstarted(deviceId || video.src, video);
    };

    video.onended = () => {
      if(this.onended) this.onended(video.src || deviceId, video);
    };

        // Create a container for the video and controls
    const videoContainer = document.createElement('div');
    videoContainer.className = 'video-container';
    videoContainer.appendChild(video);

    if(!deviceId) {
      // Create controls
      const controlsDiv = document.createElement('div');
      controlsDiv.className = 'video-controls';

      const playPauseBtn = document.createElement('button');
      playPauseBtn.innerText = '⏸️';
      playPauseBtn.onclick = () => {
          if (video.paused) {
              video.play();
              playPauseBtn.innerText = '⏸️';
          } else {
              video.pause();
              playPauseBtn.innerText = '▶️';
          }
      };

      const seekSlider = document.createElement('input');
      seekSlider.type = 'range';
      seekSlider.min = '0';
      seekSlider.max = '100';
      seekSlider.value = '0';
      seekSlider.oninput = (e) => {
          const seekTo = video.duration * (+seekSlider.value / 100);
          video.currentTime = seekTo;
      };

      video.ontimeupdate = () => {
          seekSlider.value = String((video.currentTime / video.duration) * 100);
      };

      controlsDiv.appendChild(playPauseBtn);
      controlsDiv.appendChild(seekSlider);

      videoContainer.appendChild(controlsDiv);
    }
    
    videoContainer.appendChild(video);
    this.parentElement.appendChild(videoContainer);

    this.currentMediaElement = video;
    if(this.ontargetchanged) this.ontargetchanged(deviceId || video.src, video);
  }

  deinitMediaElement() {
    this.toggleDialogButton.style.display = 'none';
    if (this.currentMediaElement) {
      if (this.currentMediaElement instanceof HTMLVideoElement && this.currentMediaElement.srcObject) {
        const tracks = (this.currentMediaElement.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
      if(this.ondelete) this.ondelete(this.currentMediaElement.src || (this.currentMediaElement as HTMLVideoElement).srcObject, this.currentMediaElement);
      this.currentMediaElement.parentElement?.remove();
      this.currentMediaElement = null;
    }
  }
  
}