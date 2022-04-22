from tensorflow import keras
from keras.preprocessing import image
import sys
import cv2
import numpy as np
import os

model = keras.models.load_model('python/model')

model.compile(loss='binary_crossentropy', optimizer='rmsprop', metrics=['accuracy'])
image_path = sys.argv[1]
img_size = 150

data = []
img_arr = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
resized_arr = cv2.resize(img_arr, (img_size, img_size))
data.append([resized_arr])
data = np.array(data)

img = np.array(data) / 255
#print(img, img.shape)
img = img.reshape(-1, img_size, img_size, 1)
#print(img, img.shape)

classes = model.predict(img)

if(classes<0.5):
    print("Pneumonia Detected")
else:
    print("Normal")
