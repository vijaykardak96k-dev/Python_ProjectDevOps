pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
        timestamps()
        disableConcurrentBuilds()
    }

    environment {
        DOCKERHUB_USER = 'vijaykardak'
        BACKEND_IMAGE = 'vijaykardak/smart-farm-back'
        FRONTEND_IMAGE = 'vijaykardak/smart-farm-front'
        NAMESPACE = 'smart-farm'
        IMAGE_TAG = "${BUILD_NUMBER}"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Backend Test') {
            steps {
                sh '''
                    python3 -m venv .venv-ci
                    . .venv-ci/bin/activate
                    python -m pip install --upgrade pip
                    pip install -q -r backend/requirements-dev.txt
                    pytest -q tests/test_api.py
                '''
            }
        }

        stage('Frontend Build Test') {
            steps {
                dir('frontend') {
                    sh '''
                        npm ci
                        npm run build
                    '''
                }
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('SonarQube') {
                    sh 'sonar-scanner'
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Build Backend Image') {
            steps {
                sh "docker build -t ${BACKEND_IMAGE}:${IMAGE_TAG} backend"
            }
        }

        stage('Build Frontend Image') {
            steps {
                sh "docker build -t ${FRONTEND_IMAGE}:${IMAGE_TAG} frontend"
            }
        }

        stage('Push Docker Images') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'dockerhub-credentials',
                        usernameVariable: 'DOCKER_USER',
                        passwordVariable: 'DOCKER_PASS'
                    )
                ]) {
                    sh '''
                        echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                        docker push "${BACKEND_IMAGE}:${IMAGE_TAG}"
                        docker push "${FRONTEND_IMAGE}:${IMAGE_TAG}"
                        docker logout
                    '''
                }
            }
        }

        stage('kOps - MongoDB') {
            when {
                branch 'main'
            }
            steps {
                withKubeConfig([credentialsId: 'kubernetes-kubeconfig']) {
                    sh '''
                        kubectl get nodes
                        kubectl get namespace ${NAMESPACE} >/dev/null 2>&1 || kubectl create namespace ${NAMESPACE}
                        kubectl -n ${NAMESPACE} get secret smart-farm-secrets >/dev/null
                        echo "MongoDB secret verified. MongoDB is managed externally for this deployment."
                    '''
                }
            }
        }

        stage('kOps - Backend') {
            when {
                branch 'main'
            }
            steps {
                withKubeConfig([credentialsId: 'kubernetes-kubeconfig']) {
                    sh '''
                        kubectl apply -f k8s/namespace.yaml
                        kubectl apply -f k8s/configmap.yaml
                        kubectl apply -f k8s/backend-service.yaml
                        kubectl apply -f k8s/backend-deployment.yaml
                        kubectl apply -f k8s/pdb.yaml
                        kubectl apply -f k8s/hpa.yaml
                        kubectl -n ${NAMESPACE} set image deployment/smart-farm-backend backend=${BACKEND_IMAGE}:${IMAGE_TAG}
                        kubectl -n ${NAMESPACE} rollout status deployment/smart-farm-backend --timeout=5m
                    '''
                }
            }
        }

        stage('kOps - Frontend') {
            when {
                branch 'main'
            }
            steps {
                withKubeConfig([credentialsId: 'kubernetes-kubeconfig']) {
                    sh '''
                        kubectl apply -f k8s/frontend-service.yaml
                        kubectl apply -f k8s/frontend-deployment.yaml
                        kubectl -n ${NAMESPACE} set image deployment/smart-farm-frontend frontend=${FRONTEND_IMAGE}:${IMAGE_TAG}
                        kubectl -n ${NAMESPACE} rollout status deployment/smart-farm-frontend --timeout=5m
                    '''
                }
            }
        }
    }

    post {
        always {
            sh 'rm -rf .venv-ci frontend/node_modules frontend/dist || true'
            echo "Build #${BUILD_NUMBER} completed with image tag ${IMAGE_TAG}"
        }
        success {
            echo 'Smart Farm pipeline completed successfully.'
        }
        failure {
            echo 'Smart Farm pipeline failed. Check the failed stage and Jenkins console log.'
        }
    }
}
