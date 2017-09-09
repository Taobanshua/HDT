"""
A Lambda Handler Entry Point For Using Keras

See: https://ryan-cranfill.github.io/keras-aws-lambda/
"""
# flake8: noqa
import ctypes
import os


os.environ["THEANO_FLAGS"] = "base_compiledir=/tmp/.theano"
os.environ["KERAS_BACKEND"] = "theano"


for d, _, files in os.walk('lib'):
	for f in files:
		if f.endswith('.a') or f.endswith('.settings'):
			continue
		print('loading %s...' % f)
		ctypes.cdll.LoadLibrary(os.path.join(d, f))


import boto3
from keras.models import load_model
from numpy import array


_CACHE = {}
S3 = boto3.client("s3")


def load_keras_model(bucket, key):
	if bucket not in _CACHE:
		_CACHE[bucket] = {}

	if key not in _CACHE[bucket]:
		model_path = "/tmp/%s_%s_model" % (bucket, key)
		with open(model_path, "wb") as out:
			out.write(S3.get_object(Bucket=bucket, Key=key)["Body"])
		_CACHE[bucket][key] = load_model(model_path)
	return _CACHE[bucket][key]


def handler(event, context):
	model_bucket = event["model_bucket"]
	model_key = event["model_key"]
	deck_vector = event['deck_vector']
	model = load_keras_model(model_bucket, model_key)
	data = array([deck_vector])
	prediction = model.predict_classes(data)[0]
	return {'predicted_class': prediction}
