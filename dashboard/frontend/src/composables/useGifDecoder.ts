import { ref } from 'vue';
import { parseGIF, decompressFrames } from 'gifuct-js';

export interface DecodedFrame {
    imageData: ImageData;
    delay: number;
}

export function useGifDecoder() {
    const frames = ref<DecodedFrame[]>([]);
    const loading = ref(false);
    const error = ref('');
    let gifWidth = 0;
    let gifHeight = 0;

    async function decode(url: string) {
        loading.value = true;
        error.value = '';
        frames.value = [];

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch GIF: ${response.status}`);
            const buffer = await response.arrayBuffer();

            const gif = parseGIF(buffer);
            const decompressed = decompressFrames(gif, true);

            if (decompressed.length === 0) {
                throw new Error('No frames found in GIF');
            }

            gifWidth = gif.lsd.width || decompressed[0].dims.width;
            gifHeight = gif.lsd.height || decompressed[0].dims.height;

            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = gifWidth;
            tempCanvas.height = gifHeight;
            const tempCtx = tempCanvas.getContext('2d')!;

            const composed: DecodedFrame[] = [];

            for (const frame of decompressed) {
                const { width: fw, height: fh, top, left } = frame.dims;

                const patchCanvas = document.createElement('canvas');
                patchCanvas.width = fw;
                patchCanvas.height = fh;
                const patchCtx = patchCanvas.getContext('2d')!;
                const patchData = patchCtx.createImageData(fw, fh);
                patchData.data.set(frame.patch);
                patchCtx.putImageData(patchData, 0, 0);

                tempCtx.drawImage(patchCanvas, left, top);

                const composited = tempCtx.getImageData(0, 0, gifWidth, gifHeight);
                composed.push({
                    imageData: new ImageData(new Uint8ClampedArray(composited.data), gifWidth, gifHeight),
                    delay: frame.delay <= 10 ? 100 : frame.delay,
                });

                if (frame.disposalType === 2) {
                    tempCtx.clearRect(left, top, fw, fh);
                }
            }

            frames.value = composed;
            loading.value = false;
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to decode GIF';
            loading.value = false;
        }
    }

    function renderToCanvas(canvas: HTMLCanvasElement, frameIndex: number) {
        if (frames.value.length === 0 || frameIndex >= frames.value.length) return;
        canvas.width = gifWidth;
        canvas.height = gifHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.putImageData(frames.value[frameIndex].imageData, 0, 0);
    }

    function getSize() {
        return { width: gifWidth, height: gifHeight };
    }

    return { frames, loading, error, decode, renderToCanvas, getSize };
}
