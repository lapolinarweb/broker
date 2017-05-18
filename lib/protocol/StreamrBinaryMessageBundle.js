const BufferMaker = require('buffermaker')
const BufferReader = require('buffer-reader')

const StreamrBinaryMessageWithKafkaMetadata = require('./StreamrBinaryMessageWithKafkaMetadata')

const VERSION = 0

function StreamrBinaryMessageBundle(streamId, streamPartition) {
	if (streamId === undefined || streamPartition === undefined) {
		throw "streamId and streamPartition must be defined!"
	}

	this.buffer = new BufferMaker()
	this.buffer.Int8(VERSION)
	this.streamId = streamId
	this.streamPartition = streamPartition
	this.count = 0
}

StreamrBinaryMessageBundle.prototype.add = function(streamrBinaryMessageWithKafkaMetadata) {
	var bytes = streamrBinaryMessageWithKafkaMetadata.toBytes()
	var streamrBinaryMessage = streamrBinaryMessageWithKafkaMetadata.getStreamrBinaryMessage()

	if (this.streamId !== streamrBinaryMessage.streamId || this.streamPartition !== streamrBinaryMessage.streamPartition) {
		throw "streamId and streamPartition do not match the bundle! Message streamId: "+streamrBinaryMessage.streamId+", streamPartition: "+streamrBinaryMessage.streamPartition+" - Bundle streamId: "+this.streamId+", streamPartition: "+this.streamPartition
	}

	this.buffer.Int32BE(bytes.length)
	this.buffer.string(bytes)

	this.count++

	if (this.minOffset === undefined || this.minOffset > streamrBinaryMessageWithKafkaMetadata.offset) {
		this.minOffset = streamrBinaryMessageWithKafkaMetadata.offset
	}
	if (this.maxOffset === undefined || this.maxOffset < streamrBinaryMessageWithKafkaMetadata.offset) {
		this.maxOffset = streamrBinaryMessageWithKafkaMetadata.offset
	}
	if (this.minTimestamp === undefined || this.minTimestamp > streamrBinaryMessage.timestamp) {
		this.minTimestamp = streamrBinaryMessage.timestamp
	}
	if (this.maxTimestamp === undefined || this.maxTimestamp < streamrBinaryMessage.timestamp) {
		this.maxTimestamp = streamrBinaryMessage.timestamp
	}
}

StreamrBinaryMessageBundle.prototype.toBytes = function() {
	return {
		streamId: this.streamId,
		streamPartition: this.streamPartition,
		count: this.count,
		bytes: this.buffer.make(),
		minOffset: this.minOffset,
		maxOffset: this.maxOffset,
		minTimestamp: this.minTimestamp,
		maxTimestamp: this.maxTimestamp
	}
}

/*static*/ StreamrBinaryMessageBundle.fromBytes = function(buf, contentAsBytes) {
	const arr = []
	const reader = buf instanceof BufferReader ? buf : new BufferReader(buf)
	const version = reader.nextInt8()

	if (version == 0) {
		try {
			while (reader.tell() < buf.length) {
				var length = reader.nextInt32BE()
				var bytes = reader.nextBuffer(length)
				arr.push(StreamrBinaryMessageWithKafkaMetadata.fromBytes(bytes, contentAsBytes))
			}
		} catch (err) {
			console.log("Error while reading StreamrBinaryMessageBundle buffer: ", err)
		}

		return arr
	} else {
		throw "Unknown version: "+version
	}
}

module.exports = StreamrBinaryMessageBundle