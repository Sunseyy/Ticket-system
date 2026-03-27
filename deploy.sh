#!/bin/bash
set -e

echo "Déploiement des configurations..."
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/config
kubectl apply -f k8s/database
kubectl apply -f k8s/backend
kubectl apply -f k8s/frontend
kubectl apply -f k8s/networking
echo "Déploiement terminé avec succès !"
