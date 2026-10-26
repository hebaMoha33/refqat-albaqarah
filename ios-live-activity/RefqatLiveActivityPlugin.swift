import Foundation
import ActivityKit
import Capacitor


@objc(RefqatLiveActivityPlugin)
public class RefqatLiveActivityPlugin:
    CAPPlugin,
    CAPBridgedPlugin
{

    public let identifier =
        "RefqatLiveActivityPlugin"

    public let jsName =
        "RefqatLiveActivity"

    public let pluginMethods:
        [CAPPluginMethod] = [

        CAPPluginMethod(
            name: "start",
            returnType:
                CAPPluginReturnPromise
        ),

        CAPPluginMethod(
            name: "update",
            returnType:
                CAPPluginReturnPromise
        ),

        CAPPluginMethod(
            name: "end",
            returnType:
                CAPPluginReturnPromise
        ),

        CAPPluginMethod(
            name: "status",
            returnType:
                CAPPluginReturnPromise
        )
    ]


    /* =====================================
       HELPERS
    ===================================== */

    private func normalizedProgress(
        _ value: Double
    ) -> Double {

        return min(
            max(
                value,
                0
            ),
            100
        )
    }


    private func normalizedCompleted(
        _ completed: Int,
        total: Int
    ) -> Int {

        return min(
            max(
                completed,
                0
            ),
            max(
                total,
                0
            )
        )
    }


    private func activeActivity(
        type: String
    ) -> Activity<
        RefqatLiveActivityAttributes
    >? {

        return Activity<
            RefqatLiveActivityAttributes
        >
        .activities
        .first {
            $0.attributes.type ==
                type
        }
    }


    /* =====================================
       START
    ===================================== */

    @objc
    func start(
        _ call: CAPPluginCall
    ) {

        guard #available(
            iOS 16.1,
            *
        ) else {

            call.resolve([
                "supported": false,
                "enabled": false
            ])

            return
        }


        let authorizationInfo =
            ActivityAuthorizationInfo()


        guard
            authorizationInfo
                .areActivitiesEnabled
        else {

            call.resolve([
                "supported": true,
                "enabled": false,
                "active": false
            ])

            return
        }


        let type =
            call.getString(
                "type"
            ) ??
            "morning"


        let title =
            call.getString(
                "title"
            ) ??
            "أذكار الصباح"


        let total =
            max(
                call.getInt(
                    "total"
                ) ??
                34,
                1
            )


        let completed =
            normalizedCompleted(
                call.getInt(
                    "completed"
                ) ??
                0,

                total:
                    total
            )


        let progress =
            normalizedProgress(
                call.getDouble(
                    "progress"
                ) ??
                0
            )


        Task { @MainActor in

            /*
             إذا كان هناك نشاط قديم
             من نفس النوع، ننهيه أولًا.
            */
            let oldActivities =
                Activity<
                    RefqatLiveActivityAttributes
                >
                .activities
                .filter {
                    $0.attributes.type ==
                        type
                }


            for activity
                in oldActivities {

                await activity.end(
                    nil,
                    dismissalPolicy:
                        .immediate
                )
            }


            let attributes =
                RefqatLiveActivityAttributes(
                    type:
                        type,

                    title:
                        title
                )


            let state =
                RefqatLiveActivityAttributes
                    .ContentState(
                        completed:
                            completed,

                        total:
                            total,

                        progress:
                            progress
                    )


            let content =
                ActivityContent(
                    state:
                        state,

                    staleDate:
                        nil,

                    relevanceScore:
                        100
                )


            do {

                let activity =
                    try Activity<
                        RefqatLiveActivityAttributes
                    >
                    .request(
                        attributes:
                            attributes,

                        content:
                            content,

                        pushType:
                            nil
                    )


                call.resolve([
                    "supported": true,
                    "enabled": true,
                    "active": true,
                    "id":
                        activity.id
                ])

            } catch {

                call.reject(
                    "تعذر بدء النشاط المباشر.",
                    nil,
                    error
                )
            }
        }
    }


    /* =====================================
       UPDATE
    ===================================== */

    @objc
    func update(
        _ call: CAPPluginCall
    ) {

        guard #available(
            iOS 16.1,
            *
        ) else {

            call.resolve([
                "supported": false
            ])

            return
        }


        let type =
            call.getString(
                "type"
            ) ??
            "morning"


        guard
            let activity =
                activeActivity(
                    type:
                        type
                )
        else {

            call.resolve([
                "supported": true,
                "active": false
            ])

            return
        }


        let total =
            max(
                call.getInt(
                    "total"
                ) ??
                34,
                1
            )


        let completed =
            normalizedCompleted(
                call.getInt(
                    "completed"
                ) ??
                0,

                total:
                    total
            )


        let progress =
            normalizedProgress(
                call.getDouble(
                    "progress"
                ) ??
                0
            )


        let state =
            RefqatLiveActivityAttributes
                .ContentState(
                    completed:
                        completed,

                    total:
                        total,

                    progress:
                        progress
                )


        let content =
            ActivityContent(
                state:
                    state,

                staleDate:
                    nil,

                relevanceScore:
                    100
            )


        Task { @MainActor in

            await activity.update(
                content
            )


            call.resolve([
                "supported": true,
                "active": true,
                "id":
                    activity.id,

                "completed":
                    completed,

                "total":
                    total,

                "progress":
                    progress
            ])
        }
    }


    /* =====================================
       END
    ===================================== */

    @objc
    func end(
        _ call: CAPPluginCall
    ) {

        guard #available(
            iOS 16.1,
            *
        ) else {

            call.resolve([
                "supported": false
            ])

            return
        }


        let type =
            call.getString(
                "type"
            ) ??
            "morning"


        let activities =
            Activity<
                RefqatLiveActivityAttributes
            >
            .activities
            .filter {
                $0.attributes.type ==
                    type
            }


        Task { @MainActor in

            for activity
                in activities {

                await activity.end(
                    nil,
                    dismissalPolicy:
                        .immediate
                )
            }


            call.resolve([
                "supported": true,
                "active": false
            ])
        }
    }


    /* =====================================
       STATUS
    ===================================== */

    @objc
    func status(
        _ call: CAPPluginCall
    ) {

        guard #available(
            iOS 16.1,
            *
        ) else {

            call.resolve([
                "supported": false,
                "enabled": false,
                "active": false
            ])

            return
        }


        let authorizationInfo =
            ActivityAuthorizationInfo()


        let activity =
            activeActivity(
                type:
                    "morning"
            )


        call.resolve([
            "supported": true,

            "enabled":
                authorizationInfo
                    .areActivitiesEnabled,

            "active":
                activity != nil,

            "id":
                activity?.id ?? ""
        ])
    }
}