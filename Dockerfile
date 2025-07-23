FROM node:16 as build-stage
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client .
RUN npm run build

FROM python:3.9-slim
WORKDIR /app
COPY --from=build-stage /app/client/build ./client/build
COPY api api
COPY requirements.txt .

RUN pip install -r requirements.txt

EXPOSE 5000
CMD ["python", "api/app.py"]