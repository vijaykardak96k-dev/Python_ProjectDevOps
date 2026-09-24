pipeline {
    agent any

    environment {
        REGISTRY = 'docker.io'
        DOCKERHUB_USER = 'vijaykardak'
        BACKEND_IMAGE = 'vijaykardak/smart-farm-back'
        FRONTEND_IMAGE = 'vijaykardak/smart-farm-front'
        RELEASE_NAME = 'smart-farm'
        NAMESPACE = 'smart-farm'
        IMAGE_TAG = "${BUILD_NUMBER}"
    }

    stages {
        stage('Checkout') {
            steps { checkout scm }
        }

        stage('Test Backend') {
            steps {
                sh 'python3 -m venv .venv-ci'
                sh '. .venv-ci/bin/activate && pip install -q -r backend/requirements-dev.txt && pytest -q tests/test_api.py'
            }
        }

        stage('Build Images') {
            steps {
                sh "docker build -t ${BACKEND_IMAGE}:${IMAGE_TAG} backend"
                sh "docker build -t ${FRONTEND_IMAGE}:${IMAGE_TAG} frontend"
            }
        }

        stage('Push Images') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    sh 'echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin'
                    sh "docker push ${BACKEND_IMAGE}:${IMAGE_TAG}"
                    sh "docker push ${FRONTEND_IMAGE}:${IMAGE_TAG}"
                    sh 'docker logout'
                }
            }
        }

        stage('Deploy with Helm') {
            when {
                branch 'main'
            }
            steps {
                withKubeConfig([credentialsId: 'kubernetes-kubeconfig']) {
                    sh "helm upgrade --install ${RELEASE_NAME} helm/smart-farm --namespace ${NAMESPACE} --create-namespace --set backend.image.tag=${IMAGE_TAG} --set frontend.image.tag=${IMAGE_TAG} --wait --timeout 5m"
                }
            }
        }
    }

    post {
        always {
            sh 'rm -rf .venv-ci || true'
        }
    }
}
