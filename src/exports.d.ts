declare module "lz4" {
    type encodeOptions = {
        /**
         * chunk size to use (default=4Mb)
         */
        blockMaxSize?: number;

        /**
         * use high compression (default=false)
         */
        highCompression?: boolean;

        /**
         * (default=true)
         */
        blockIndependence?: boolean;

        /**
         * add compressed blocks checksum (default=false)
         */
        blockChecksum?: boolean;

        /**
         * add full LZ4 stream size (default=false)
         */
        streamSize?: boolean;

        /**
         * add full LZ4 stream checksum (default=true)
         */
        streamChecksum?: boolean;

        /**
         * use dictionary (default=false)
         */
        dict?: boolean;

        /**
         * dictionary id (default=0)
         */
        dictId?: number;
    }
    export function createEncoderStream(): import("stream").Transform
    export function createDecoderStream(): import("stream").Transform
    export function encode(input: Buffer, options?: encodeOptions): Buffer
    export function decode(input: Buffer): Buffer
}