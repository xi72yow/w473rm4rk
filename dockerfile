FROM node:16

# Install dependencies

RUN apt-get update && apt-get install -y openssl ffmpeg build-essential libxi-dev libglu1-mesa-dev libglew-dev pkg-config libgl1-mesa-dev dumb-init xvfb

# Copy the current directory contents into the container at /app

COPY . /app

# Set the working directory to /app

WORKDIR /app

# Install any needed packages

RUN yarn

# create security folder

RUN mkdir security

# Create ssl certificate

RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout ./security/api.key -subj "/CN=$cn\/emailAddress=admin@$cn/C=DE/ST=Ohio/L=Columbus/O=Widgets Inc/OU=Some Unit" -out ./security/api.pem

# Make port 3000 available to the world outside this container

EXPOSE 3000

ENTRYPOINT ["/usr/bin/dumb-init", "--", "xvfb-run", "--server-args", "-screen 0 1280x1024x24 -ac"]

CMD [ "node", "index.js" ]
