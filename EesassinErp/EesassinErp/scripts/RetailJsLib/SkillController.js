app.SkillController = function ($scope, $element, $filter, myService, $http) {


    $scope.getWorkerAlbum = function () {
        var collectionobj = {};
        collectionobj.Action = 16;
        collectionobj.Loginid = LoginId;
        var getData = myService.methode('POST', "../Skill/GetCourseDetail", JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.AlbumDetail = response.data.Result;

        });
    };



    $scope.getWorkerModuleAlbum = function () {
        var collectionobj = {};
        collectionobj.Action = 17;
        var urlParams = new URLSearchParams(window.location.search);
       
            collectionobj.id = urlParams.get('id');;
        var getData = myService.methode('POST', "../Skill/GetCourseDetail", JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.AlbumDetail = response.data.Result;

        });
    };

    $scope.getvediofromurl = function () {
        var collectionobj = {};
        collectionobj.Action = 18;
        var urlParams = new URLSearchParams(window.location.search);

        collectionobj.id = urlParams.get('id');;
        var getData = myService.methode('POST', "../Skill/GetCourseDetail", JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.CourseList = response.data.Result;
            
     
        });
    };

    
    $scope.SaveCourse = function () {
        if (isValidate()) {
            var collectionobj = {};
            collectionobj.Title = $scope.Title;
            collectionobj.id = $scope.id;
            collectionobj.Action = 1;
            collectionobj.CourseDesc = $scope.CourseDesc;
            collectionobj.Loginid = LoginId;
            collectionobj.CourseCoverPage_Preview = $scope.CourseCoverPage_Preview;
            var getData = myService.methode('POST', ("../Skill/AddCourse"), JSON.stringify(collectionobj));
            getData.then(function (response) {
                if (response.data.Result == '-1')
                {
                    showMsgBox(response.data.Result);
                }
                else if(response.data.Result > 0) {
                    showMsgBox('999', 'Save', 'Submitted Successfully', 'success', 'btn-success');
                    $scope.CourseId = response.data.Result;
                    window.location.href = "../Skill/PrincipleSkillCourses?id=" + $scope.CourseId;
                }
            });
        }
    }

    $scope.Getadddetail = function () {
        var collectionobj = {};
        collectionobj.Action = 9;
        var urlParams = new URLSearchParams(window.location.search);
        $scope.CourseId = urlParams.get('id');
        collectionobj.CourseId = $scope.CourseId;
        collectionobj.Loginid = LoginId;
        var getData = myService.methode('POST', "../Skill/GetCourseDetail", JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.AllDetail = response.data.Result;
            $scope.Title = response.data.Result[0].Title;
            $scope.CourseDesc  = response.data.Result[0].CourseDesc 
            $scope.CourseCoverPage_Preview = response.data.Result[0].CourseCoverPage;
           
            $scope.Lessonorder = (response.data.Result[0].Lessonorder || '').toString().toLowerCase() === 'true';
            $scope.VideoOrder = (response.data.Result[0].VideoOrder || '').toString().toLowerCase() === 'true';
            $scope.LimitVideo = (response.data.Result[0].LimitVideo || '').toString().toLowerCase() === 'true';
            $scope.AutoCertificate = (response.data.Result[0].AutoCertificate || '').toString().toLowerCase() === 'true';
            $scope.StartDate = (response.data.Result[0].StartDate || '').toString().toLowerCase() === 'true';
            $scope.EndDate = (response.data.Result[0].EndDate || '').toString().toLowerCase() === 'true';
            $scope.OnlyPublished = (response.data.Result[0].OnlyPublished || '').toString().toLowerCase() === 'true';
            $scope.CourseReminder = (response.data.Result[0].CourseReminder || '').toString().toLowerCase() === 'true';
            

            $scope.GetDetail();
        });
    };
    $scope.getUserAlbum = function () {
        var collectionobj = {};
        collectionobj.Action = 11;         
        collectionobj.Loginid = LoginId;
        var getData = myService.methode('POST', "../Skill/GetCourseDetail", JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.AllDetail = response.data.Result;
          
        });
    };
    $scope.DeleteRecord = function (Id) {

        deleteConfirmbox(
            "Do you want to delete this record?",
            function () {
                $scope.deleteRecord(Id);
            }
        );
    };

    $scope.deleteRecord = function (Id) {

        var collectionobj = {};

        collectionobj.Action = 10 ;
        collectionobj.Id = Id;

        var getData = myService.methode(
            'POST',
            "../Skill/AddCourse",
            '{obj:' + JSON.stringify(collectionobj) + '}'
        );

        getData.then(function (response) {

            if (showMsgBox(response.data.Result)) {
                $scope.GetDetail();
            }

        });
    };

    $scope.getVideoDetail = function (ModuleId) {

        var collectionobj = {};

        collectionobj.Action = 13;
        collectionobj.id = ModuleId;
        collectionobj.CourseId = $scope.CourseId;
        collectionobj.Loginid = LoginId;

        var getData = myService.methode(
            'POST',
            "../Skill/GetCourseDetail",
            JSON.stringify(collectionobj)
        );

        getData.then(function (response) {

            var videos = response.data.Result || [];
             
            angular.forEach($scope.ModuleDetail, function (module) {

                if (module.id == ModuleId) {
                    module.Videos = videos;
                }

            });

        });
    };
    $scope.GetDetail = function () { 
            var collectionobj = {}; 
            collectionobj.Action = 4;
            collectionobj.CourseId = $scope.CourseId;
            collectionobj.Loginid = LoginId;
            var getData = myService.methode('POST', "../Skill/GetCourseDetail", JSON.stringify(collectionobj));
            getData.then(function (response) {
                $scope.ModuleDetail = response.data.Result;
                angular.forEach($scope.ModuleDetail, function (module) {
                    $scope.AddVideo(module);
                    $scope.getVideoDetail(module.id);
                });
            }); 
    };

    $scope.UpdateStatus = function (Id, Publish) {
        var collectionobj = {}; 
        collectionobj.Action = 12;
        collectionobj.CourseId = Id;
        collectionobj.Loginid = LoginId; 
        collectionobj.Publish = Publish;
        var getData = myService.methode('POST', ("../Skill/AddCourse"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            if (response.data.Result > 0) {
                showMsgBox('999', 'Save', 'Submitted Successfully', 'success', 'btn-success');
                $scope.Moduleid = response.data.Result;
                $scope.GetModuleDetail();
                var modalElement = document.getElementById('addModuleModal');
                var modal = bootstrap.Modal.getInstance(modalElement);
                if (modal) {
                    modal.hide();
                }
            }
        });
    }

    $scope.UpdateAlbumStatus = function (Id, Publish) {
        var collectionobj = {};
        collectionobj.Action = 15;
        collectionobj.CourseId = Id;
        collectionobj.Loginid = LoginId;
        collectionobj.Publish = Publish;
        var getData = myService.methode('POST', ("../Skill/AddCourse"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.getUserAlbum();
        });
    }


    $scope.redirectotupdate = function (id) {
        window.location.href = "../Skill/PrincipleSkillCourses?id=" + id;
    };
    $scope.Workerredirection = function (id) {
        window.location.href = "../Skill/WorkerAlbum?id=" + id;
    }; 
    $scope.WorkerSkillModule = function (id) {
        window.location.href = "../Skill/WorkerSkillModule?id=" + id;
    }; 
    
    $scope.SaveModule = function () {
        if (isValidate()) {
            var collectionobj = {};
            collectionobj.Modulename = $scope.Modulename;
            collectionobj.id = $scope.id;
            collectionobj.Action = 2;
            collectionobj.CourseId = $scope.CourseId;
            collectionobj.Loginid = LoginId;
            collectionobj.Sequence = $scope.Sequence;
            collectionobj.ModuleDesc = $scope.ModuleDesc;
            collectionobj.Publish = $scope.ChkmodulePublish;
            var getData = myService.methode('POST', ("../Skill/AddCourse"), JSON.stringify(collectionobj));
            getData.then(function (response) {
                if (response.data.Result > 0) {
                    showMsgBox('999', 'Save', 'Submitted Successfully', 'success', 'btn-success');
                    $scope.Moduleid = response.data.Result;
                    $scope.GetModuleDetail();
                    var modalElement = document.getElementById('addModuleModal');
                    var modal = bootstrap.Modal.getInstance(modalElement);
                    if (modal) {
                        modal.hide();
                    }
                }
            });
        }
    }

     

    $scope.GetModuleDetail = function () {
        if (isValidate()) {

            var collectionobj = {};

            collectionobj.Action = 4;
            collectionobj.CourseId = $scope.CourseId;
            collectionobj.Loginid = LoginId;
            var getData = myService.methode('POST', "../Skill/GetCourseDetail", JSON.stringify(collectionobj));
            getData.then(function (response) {
                $scope.ModuleDetail = response.data.Result;
                $timeout(function () {
                    var container = angular.element("#courseModulesContainer");
                    container.empty();
                    var template = document.querySelector("#moduleTemplate");
                    if (!template) {
                        console.error("moduleTemplate not found");
                        return;
                    }
                    var content = template.content.cloneNode(true);
                    var compiledContent = $compile(content)($scope);
                    container.append(compiledContent);
                }, 100);
            });

        }
    };

    $scope.uploadFile = function (fieldName, input) {
        if (input.files && input.files[0]) {
            var file = input.files[0];
            var maxSize = 3 * 1024 * 1024;
            var allowedExtensions = ['png', 'jpg', 'jpeg'];

            var extension = file.name.split('.').pop().toLowerCase();
            if (allowedExtensions.indexOf(extension) === -1) {
                swal("Invalid File", "Only PNG, JPG and JPEG files are allowed.", "error");
                input.value = '';
                return;
            }
            if (file.size > maxSize) {
                swal("File Too Large", "Maximum allowed file size is 3 MB.", "error");
                input.value = '';
                return;
            }
            var fileNameField = fieldName.replace("FilePath", "FileName");
            $scope[fileNameField] = file.name;

            var filerdr = new FileReader();

            filerdr.onload = function (e) {
                $scope[fieldName + "_Preview"] = e.target.result;

                $scope.$applyAsync();
            };

            filerdr.readAsDataURL(file);
        }
    };

    $scope.SaveThumbnail = function (fieldName, input) {
        if (input.files && input.files[0]) {
            var file = input.files[0];
            var maxSize = 3 * 1024 * 1024;
            var allowedExtensions = ['png', 'jpg', 'jpeg'];

            var extension = file.name.split('.').pop().toLowerCase();
            if (allowedExtensions.indexOf(extension) === -1) {
                swal("Invalid File", "Only PNG, JPG and JPEG files are allowed.", "error");
                input.value = '';
                return;
            }
            if (file.size > maxSize) {
                swal("File Too Large", "Maximum allowed file size is 3 MB.", "error");
                input.value = '';
                return;
            }
            var fileNameField = fieldName.replace("FilePath", "FileName");
            $scope[fileNameField] = file.name;

            var filerdr = new FileReader();

            filerdr.onload = function (e) {
                $scope[fieldName + "_Preview"] = e.target.result;
                $scope.$applyAsync();
            };
            filerdr.readAsDataURL(file);
            var collectionobj = {};
            collectionobj.Action = 3;
            collectionobj.CourseId = $scope.CourseId;
            collectionobj.Loginid = LoginId;
            collectionobj.CourseCoverPage_Preview = $scope.ModuleThumbnail_Preview;
            collectionobj.id = $scope.Moduleid;
            var getData = myService.methode('POST', ("../Skill/AddCourse"), JSON.stringify(collectionobj));
            getData.then(function (response) {
                showMsgBox(response.data.Result);
            });
        }
    };

    $scope.AddVideo = function (module) {

        if (!module.Videos) {
            module.Videos = [];
        }

        module.Videos.push({
            id: "",
            Title: "",
            Description: "",
            ThumbnailFile: null,
            ThumbnailPreview: null,
            VideoFile: null

        });

    };


    $scope.DeleteVideo = function (Id) {
        deleteConfirmbox(
            "Do you want to delete this record?",
            function () {
                $scope.ConDeleteVideo(Id);
            }
        );
        
    };
    $scope.ConDeleteVideo = function (Id) {
        
            var collectionobj = {};
            collectionobj.id =  
            collectionobj.Action = 6;
        collectionobj.id = Id;
            var getData = myService.methode('POST', ("../Skill/AddCourse"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.Getadddetail();
                if (response.data.Result > 0) {
                    showMsgBox('999', 'Delete', 'Record Deleted Successfully', 'danger', 'btn-danger');
                }
            });
            module.Videos.splice(index, 1); 
    };

    $scope.SaveVideo = function (video, moduleid,VedioId,Action) {

        var fd = new FormData();
        fd.append("Action", Action);
        fd.append("CourseId", $scope.CourseId);
        fd.append("moduleid", moduleid);
        fd.append("id", VedioId);
        fd.append("Loginid", LoginId);
        fd.append("Title", video.Title);
        fd.append("Description", video.Description);
        fd.append("ThumbnailFile_Preview", video.ThumbnailPreview);
        fd.append("VideoFile", $scope.selectfile);

        $http.post("../Skill/SaveVideo", fd, {
            transformRequest: angular.identity,
            headers: { 'Content-Type': undefined }
        }).then(function (response) {
            if (response.data.Result > 0) {
                showMsgBox(response.data.Result);
                $scope.Skillvideoid = response.data.Result;
                $scope.Getadddetail();
            }
        });
    };
  
    $scope.VideoChange = function (files, video) {

        if (!files || files.length === 0) {
            return;
        }

        $scope.selectfile = files[0];

        console.log("selectfile =", $scope.selectfile);
        console.log("name =", $scope.selectfile.name);
        console.log("size =", $scope.selectfile.size);
        console.log("type =", $scope.selectfile.type);
        var file = files[0];
        video.VideoFile = file; 

        $scope.$applyAsync();
    };

    $scope.UpdateFlags = function () {
        var collectionobj = {};
        var urlParams = new URLSearchParams(window.location.search);
        $scope.Moduleid = urlParams.get('id');
        collectionobj.id = $scope.Moduleid;
        collectionobj.Loginid = LoginId;
        collectionobj.Lessonorder = $scope.Lessonorder;
        collectionobj.VideoOrder = $scope.VideoOrder;
        collectionobj.LimitVideo = $scope.LimitVideo;
        collectionobj.StartDate = $scope.StartDate;
        collectionobj.EndDate = $scope.EndDate;
        collectionobj.OnlyPublished = $scope.OnlyPublished;
        collectionobj.AutoCertificate = $scope.AutoCertificate;
        collectionobj.CourseReminder = $scope.CourseReminder;
     
       
        collectionobj.Action = 7;
        var getData = myService.methode('POST', ("../Skill/UpdateFlags"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            if (response.data.Result > 0) {

            }
        });
    }

    $scope.currentLessonIndex = 0;


    // NEXT LESSON
    $scope.NextLesson = function () {

        if (!$scope.CourseList || $scope.CourseList.length === 0) {
            return;
        }

        if ($scope.currentLessonIndex < $scope.CourseList.length - 1) {

            $scope.currentLessonIndex++;

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        }
    };


    // PREVIOUS LESSON
    $scope.PreviousLesson = function () {

        if (!$scope.CourseList || $scope.CourseList.length === 0) {
            return;
        }

        if ($scope.currentLessonIndex > 0) {

            $scope.currentLessonIndex--;

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        }
    };

}